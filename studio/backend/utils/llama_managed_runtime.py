# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM studio team. All rights reserved.

"""LAiM owns its llama.cpp: put our own build in our own folder and keep it current by itself.

Discovery already ranks the managed tree above anything a package manager left on PATH, so seeding
that tree once is what moves inference off a foreign build -- no button, no winget. Once the marker
is there, the normal freshness check decides whether a newer upstream release exists and the same
installer applies it. Opt out with LAiM_DISABLE_MANAGED_LLAMA=1; the general
LAiM_DISABLE_UPDATE_CHECK also silences it.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

import structlog

from utils.prebuilt import update_flow as _flow

logger = structlog.get_logger(__name__)

_MARKER_NAME = "LAiM_PREBUILT_INFO.json"
# A release check is cheap (24h cache); a failed download must not come back every boot.
_CHECK_SECONDS = 6 * 60 * 60
_RETRY_AFTER_SECONDS = 24 * 60 * 60
_INSTALL_TIMEOUT_SECONDS = 45 * 60

_lock = threading.Lock()
_cycle_started = False
_job_running = False


def _disabled() -> bool:
    from utils.update_status import update_checks_disabled

    return os.environ.get("LAiM_DISABLE_MANAGED_LLAMA") == "1" or update_checks_disabled()


def _state_path() -> Path:
    from utils.paths.storage_roots import studio_root

    return Path(studio_root()) / "cache" / "llama_managed_runtime.json"


def _read_state() -> dict:
    try:
        return json.loads(_state_path().read_text(encoding = "utf-8"))
    except (OSError, ValueError):
        return {}


def _write_state(**fields) -> None:
    path = _state_path()
    try:
        state = _read_state()
        state.update(fields)
        path.parent.mkdir(parents = True, exist_ok = True)
        path.write_text(json.dumps(state), encoding = "utf-8")
    except OSError as exc:
        logger.debug("llama managed runtime: state not written", error = str(exc))


def _throttled() -> bool:
    last = _read_state().get("last_attempt_utc")
    if not isinstance(last, (int, float)):
        return False
    return (time.time() - last) < _RETRY_AFTER_SECONDS


def managed_root() -> Path:
    """The llama.cpp folder LAiM manages -- the same rule install_llama_prebuilt.py and binary
    discovery use, so we install exactly where the next lookup will look."""
    override = (os.environ.get("UNSLOTH_LLAMA_CPP_PATH") or "").strip()
    if override:
        return Path(override).expanduser()
    from utils.paths.storage_roots import studio_root

    root = Path(studio_root()).expanduser()
    legacy_studio = Path.home() / ".LAiM" / "studio"
    try:
        is_legacy = root.resolve() == legacy_studio.resolve()
    except (OSError, ValueError):
        is_legacy = root == legacy_studio
    if is_legacy:
        return Path.home() / ".LAiM" / "llama.cpp"
    return root / "llama.cpp"


def _managed_build_present(root: Path) -> bool:
    return (root / _MARKER_NAME).is_file()


def _seed(root: Path, script: Path, repo: str) -> None:
    """Install the latest official prebuilt into our own folder. Nothing runs out of it yet, so no
    model unload and no coordination with the inference backend is needed."""
    global _job_running
    cmd = [
        sys.executable,
        str(script),
        "--install-dir",
        str(root),
        "--llama-tag",
        "latest",
        "--published-repo",
        repo,
    ]
    logger.info("llama managed runtime: seeding", cmd = " ".join(cmd))
    try:
        done = subprocess.run(
            cmd,
            capture_output = True,
            text = True,
            timeout = _INSTALL_TIMEOUT_SECONDS,
        )
        code, tail = done.returncode, (done.stdout or "") + (done.stderr or "")
    except subprocess.TimeoutExpired:
        code, tail = 124, "timed out"
    except OSError as exc:
        code, tail = 127, str(exc)
    if code == 0 and _managed_build_present(root):
        from utils.llama_cpp_freshness import reset_caches

        reset_caches(drop_disk = True)
        _write_state(seeded_utc = time.time(), last_result = "installed")
        logger.info("llama managed runtime: seeded", root = str(root))
    else:
        _write_state(last_attempt_utc = time.time(), last_result = "failed")
        logger.warning(
            "llama managed runtime: seed failed, keeping the system build",
            code = code,
            output = tail[-800:],
        )
    with _lock:
        _job_running = False


def maintain(*, force: bool = False) -> dict:
    """Seed our own llama.cpp when there is none, or update it when upstream is newer. Never raises:
    the worst case is that this boot keeps running the build already on the machine."""
    global _job_running
    if _disabled():
        return {"started": False, "reason": "disabled"}
    with _lock:
        if _job_running:
            return {"started": False, "reason": "in_flight"}
    try:
        from utils import llama_cpp_update as update

        root = managed_root()
        if _managed_build_present(root):
            status = update.get_update_status(force_refresh = force)
            if status.get("update_available"):
                job = update.start_update()
                _write_state(last_attempt_utc = time.time(), last_result = "updating")
                return {"started": True, "reason": "updating", "job": job}
            return {"started": False, "reason": "up_to_date"}
        if not force and _throttled():
            return {"started": False, "reason": "throttled"}
        binary = update._find_binary()
        if update._studio_custom_path_active():
            return {"started": False, "reason": "custom_path"}
        if update._active_install_is_local_link(binary):
            return {"started": False, "reason": "local_link"}
        script = _flow.find_installer_script(
            env_var = "LAiM_LLAMA_INSTALLER", script_name = "install_llama_prebuilt.py"
        )
        if script is None:
            return {"started": False, "reason": "installer_missing"}
        resolved = update._resolve_prebuilt_for_host(force_refresh = force) or {}
        if not resolved.get("prebuilt_available"):
            _write_state(last_attempt_utc = time.time(), last_result = "no_prebuilt")
            return {"started": False, "reason": "no_prebuilt"}
        _write_state(last_attempt_utc = time.time(), last_result = "seeding")
        with _lock:
            _job_running = True
        threading.Thread(
            target = _seed,
            args = (root, script, resolved.get("repo") or update.DEFAULT_PUBLISHED_REPO),
            daemon = True,
            name = "llama-managed-seed",
        ).start()
        return {"started": True, "reason": "seeding"}
    except Exception as exc:  # noqa: BLE001 - a maintenance pass must never reach the caller
        logger.debug("llama managed runtime: pass failed", error = str(exc))
        with _lock:
            _job_running = False
        return {"started": False, "reason": "error"}


def _cycle() -> None:
    while True:
        maintain()
        time.sleep(_CHECK_SECONDS)


def start() -> None:
    """Begin the maintenance cycle: one pass now, then every few hours. Called off the startup
    critical path, so a cold GitHub check costs the app nothing."""
    global _cycle_started
    with _lock:
        if _cycle_started or _disabled():
            return
        _cycle_started = True
    threading.Thread(target = _cycle, daemon = True, name = "llama-managed-runtime").start()
