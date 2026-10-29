"""Regression coverage for LAiM's first-party source and update endpoints."""

from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
OWNER = "OPusAngel"
REPOSITORY = "LAiM"


def test_desktop_updater_targets_laim_release_repository():
    config_path = REPO_ROOT / "studio" / "src-tauri" / "tauri.conf.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))

    endpoints = config["plugins"]["updater"]["endpoints"]
    assert endpoints == [
        f"https://github.com/{OWNER}/{REPOSITORY}/releases/latest/download/latest.json"
    ]


def test_runtime_recovery_uses_laim_owned_sources():
    source = (REPO_ROOT / "LAiM" / "_auto_install.py").read_text(encoding="utf-8")

    assert f"https://github.com/{OWNER}/LAiM.git" in source
    assert f"https://github.com/{OWNER}/LAiM-zoo.git" in source
    assert "github.com/LAiMai/" not in source


def test_active_first_party_endpoints_do_not_point_to_previous_owner():
    active_files = [
        REPO_ROOT / "install.ps1",
        REPO_ROOT / "install.sh",
        REPO_ROOT / "LAiM" / "_auto_install.py",
        REPO_ROOT / "LAiM" / "_gpu_init.py",
        REPO_ROOT / "studio" / "src-tauri" / "tauri.conf.json",
    ]

    for path in active_files:
        source = path.read_text(encoding="utf-8")
        assert "github.com/LAiMai/" not in source, path