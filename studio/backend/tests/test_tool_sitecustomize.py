# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

"""Hermetic tests for the workdir sitecustomize path-remap shim.

The shim (``core/inference/tool_site/sitecustomize.py``) runs at interpreter
startup inside every tool subprocess and remaps ChatGPT
code-interpreter habit paths (``/mnt/data`` etc.) onto the per-conversation
working directory. Importing it calls ``_install()``, which monkeypatches
``builtins.open`` / ``io.open`` / ``os.makedirs`` / ``os.mkdir`` /
``pathlib.Path.mkdir`` process-wide, so these tests
load it into a throwaway module and restore those globals immediately, then
exercise the pure ``_remap()`` function directly -- no subprocess, and no real
``/mnt`` or ``/tmp`` writes. The mkdir test keeps the patch installed under a
``chdir`` into ``tmp_path`` so the only real writes land in that temp dir.
"""

from __future__ import annotations

import builtins
import importlib.util
import io
import os
import pathlib
from pathlib import Path

import pytest

_SHIM = (
    Path(__file__).resolve().parent.parent
    / "core"
    / "inference"
    / "tool_site"
    / "sitecustomize.py"
)

_CONVENTION_PREFIXES = ("/mnt/data", "/mnt/outputs", "/home/sandbox", "/workspace", "/tmp/outputs")


@pytest.fixture(autouse = True)
def _convention_prefixes_absent(monkeypatch):
    """Report the convention prefixes as missing regardless of the test host.

    The shim heals a prefix only while the real directory is absent, and a host that
    happens to have (say) ``C:\\mnt\\data`` from an earlier run would make every remap
    here a pass-through. These tests describe the fresh-machine case.
    """
    real_exists = os.path.exists

    def exists(path):
        try:
            if os.fspath(path) in _CONVENTION_PREFIXES:
                return False
        except TypeError:
            pass
        return real_exists(path)

    monkeypatch.setattr(os.path, "exists", exists)


def _save_patch_targets():
    """Snapshot every global the shim patches, so tests can restore them.

    On Python < 3.11 the shim also repoints ``pathlib._NormalAccessor.open``
    (pathlib captured the original io.open at import there); the accessor is
    absent on 3.11+, so the snapshot skips it.
    """
    accessor = getattr(pathlib, "_NormalAccessor", None)
    return (
        (builtins.open, io.open, os.open, os.makedirs, os.mkdir, pathlib.Path.mkdir),
        accessor,
        accessor.open if accessor is not None else None,
    )


def _restore_patch_targets(saved):
    """Undo _save_patch_targets so the test process stays clean."""
    globals_tuple, accessor, accessor_open = saved
    (builtins.open, io.open, os.open, os.makedirs, os.mkdir, pathlib.Path.mkdir) = globals_tuple
    if accessor is not None:
        accessor.open = accessor_open


def _load_shim():
    """Import the shim without leaving its open()/mkdir patches installed."""
    saved = _save_patch_targets()
    spec = importlib.util.spec_from_file_location("_tool_sitecustomize_under_test", _SHIM)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)  # runs _install(), patching the globals
    finally:
        # Undo the process-wide patch so the test process stays clean.
        _restore_patch_targets(saved)
    mod._notified = True  # silence the one-shot stderr notice in tests
    return mod


def test_always_remap_prefixes_map_into_cwd(monkeypatch, tmp_path):
    mod = _load_shim()
    monkeypatch.chdir(tmp_path)
    cwd = os.getcwd()
    assert mod._remap("/mnt/data/out.txt") == os.path.join(cwd, "out.txt")
    assert mod._remap("/mnt/data") == cwd
    # Unrelated absolute and relative paths pass straight through.
    assert mod._remap("/etc/passwd") == "/etc/passwd"
    assert mod._remap("relative.txt") == "relative.txt"


def test_prefix_remap_contains_parent_traversal_inside_cwd(monkeypatch, tmp_path):
    # A hallucinated habit path can carry '..' in its suffix. The remapped target
    # must stay under the per-conversation CWD, never climbing into a sibling
    # session's directory: '..' components are dropped, the rest of the subpath kept.
    mod = _load_shim()
    workdir = tmp_path / "session_current" / "work"
    workdir.mkdir(parents = True)
    monkeypatch.chdir(workdir)
    cwd = os.getcwd()

    for escaping in (
        "/mnt/data/../other_session/file",
        "/mnt/data/../../secrets.txt",
        "/mnt/data/a/../../b/c.txt",
        "/mnt/data/./sub/./x.txt",
    ):
        mapped = mod._remap(escaping)
        # Never escapes the CWD subtree.
        assert mapped == cwd or mapped.startswith(cwd + os.sep), (escaping, mapped)
        assert os.path.realpath(mapped).startswith(os.path.realpath(cwd))
    # '../other_session/file' collapses to CWD/other_session/file.
    assert mod._remap("/mnt/data/../other_session/file") == os.path.join(
        cwd, "other_session", "file"
    )
    # A bare '/mnt/data/..' with nothing left maps onto the CWD itself.
    assert mod._remap("/mnt/data/..") == cwd


def test_invented_absolute_paths_are_left_untouched(monkeypatch, tmp_path):
    # There used to be a fallback that redirected any absolute write path whose parent
    # was missing onto the basename in the CWD. It made a model that asked for an
    # invented directory believe the write had landed where it asked (and left junk
    # directories inside the workspace), so the fallback is gone: the real open()
    # raises for the path the model wrote.
    mod = _load_shim()
    workdir = tmp_path / "workdir"
    workdir.mkdir()
    monkeypatch.chdir(workdir)
    for invented in ("/home/ubuntu/Workdir/app.html", "/no/such/tree/report.txt"):
        for mode in ("w", "a", "x", "w+", "r", "r+"):
            assert mod._remap_open(invented, mode) == invented
    with pytest.raises(FileNotFoundError):
        open(mod._remap_open("/no/such/tree/report.txt", "w"), "w")
    # Relative and bytes paths pass through as well.
    assert mod._remap_open("out.txt", "w") == "out.txt"
    assert mod._remap_open(b"/no/such/tree/x.bin", "w") == b"/no/such/tree/x.bin"


def test_existing_convention_prefix_is_not_shadowed(monkeypatch, tmp_path):
    # A convention prefix (/mnt/data etc.) is remapped ONLY while absent. If a real
    # host directory exists there it must pass through so its own filesystem semantics
    # apply: a real read succeeds, and a missing file under it is created there by a
    # write, never shadowed by a CWD file.
    mod = _load_shim()
    external = tmp_path / "real_prefix"
    external.mkdir()
    (external / "data.txt").write_text("real external content")

    workdir = tmp_path / "conversation"
    workdir.mkdir()
    monkeypatch.chdir(workdir)
    prefix = str(external).replace("\\", "/")
    monkeypatch.setattr(mod, "_PREFIXES", (prefix,))
    monkeypatch.setattr(mod, "_CONDITIONAL_PREFIXES", ())

    target = prefix + "/data.txt"
    # Prefix exists -> pass through for read and write.
    assert mod._remap(target) == target
    assert mod._remap_open(target, "r") == target
    assert mod._remap_open(target, "w") == target
    # A missing file under the EXISTING real prefix is left alone (parent exists),
    # so the real directory creates it -- not a CWD shadow.
    missing = prefix + "/new.txt"
    assert mod._remap_open(missing, "w") == missing

    # Remove the prefix directory -> healing resumes (absent prefix). The shim matches the
    # convention prefixes in the forward-slash spelling models write.
    (external / "data.txt").unlink()
    external.rmdir()
    assert mod._remap(prefix + "/data.txt") == os.path.join(os.getcwd(), "data.txt")


def test_os_open_and_path_touch_remap_convention_path(monkeypatch, tmp_path):
    # Path.touch() and other low-level creators go through os.open, not builtins/io.open.
    # Keep the shim's patches installed under a chdir into tmp_path so os.open is
    # patched, and confirm a convention path is healed into the CWD instead of raising.
    saved = _save_patch_targets()
    spec = importlib.util.spec_from_file_location("_tool_sitecustomize_osopen", _SHIM)
    mod = importlib.util.module_from_spec(spec)
    monkeypatch.chdir(tmp_path)
    cwd = os.getcwd()
    try:
        spec.loader.exec_module(mod)  # installs the os.open patch
        mod._notified = True
        # A unique absent prefix: a host that really has /mnt/data would pass the path through,
        # and Path.touch() would find the leftover file and return without creating anything.
        prefix = str(tmp_path / "mnt_data").replace("\\", "/")
        mod._PREFIXES = (prefix,)
        mod._CONDITIONAL_PREFIXES = ()
        pathlib.Path(prefix + "/touched.txt").touch()
        assert os.path.isfile(os.path.join(cwd, "touched.txt"))
        # Direct os.open with create flags is healed too.
        fd = os.open(prefix + "/via_os_open.txt", os.O_CREAT | os.O_WRONLY, 0o600)
        os.close(fd)
        assert os.path.isfile(os.path.join(cwd, "via_os_open.txt"))
    finally:
        _restore_patch_targets(saved)


def test_path_write_read_text_remap_convention_path(monkeypatch, tmp_path):
    # Path.open / write_text / read_text route through io.open (3.11+) or the captured
    # accessor open (< 3.11). Keep the patches installed under a chdir into tmp_path
    # and confirm a convention path is healed into the CWD on every version. This is
    # the hermetic guard for the 3.10 accessor path a plain io.open patch misses.
    saved = _save_patch_targets()
    spec = importlib.util.spec_from_file_location("_tool_sitecustomize_writetext", _SHIM)
    mod = importlib.util.module_from_spec(spec)
    monkeypatch.chdir(tmp_path)
    cwd = os.getcwd()
    try:
        spec.loader.exec_module(mod)  # installs the io.open / accessor patch
        mod._notified = True
        prefix = str(tmp_path / "mnt_data").replace("\\", "/")
        mod._PREFIXES = (prefix,)
        mod._CONDITIONAL_PREFIXES = ()
        pathlib.Path(prefix + "/note.txt").write_text("pathlib remap")
        assert os.path.isfile(os.path.join(cwd, "note.txt"))
        # read_text goes through the same mapped path and sees what was written.
        assert pathlib.Path(prefix + "/note.txt").read_text() == "pathlib remap"
        # A real absolute path passes through both patches untouched.
        real = tmp_path / "real.txt"
        pathlib.Path(str(real)).write_text("verbatim")
        assert real.read_text() == "verbatim"
    finally:
        _restore_patch_targets(saved)


def test_remap_open_still_applies_prefix_remaps(monkeypatch, tmp_path):
    # A write heals onto the CWD unconditionally; a read only when the mapped
    # target already exists.
    mod = _load_shim()
    monkeypatch.chdir(tmp_path)
    cwd = os.getcwd()
    assert mod._remap_open("/mnt/data/sub/out.txt", "w") == os.path.join(cwd, "sub", "out.txt")
    # A read whose mapped target does NOT exist keeps the original path: a missing
    # input stays truthful, not silently redirected into the CWD.
    assert mod._remap_open("/mnt/data/sub/out.txt", "r") == "/mnt/data/sub/out.txt"


def test_prefix_read_heals_only_when_mapped_target_exists(monkeypatch, tmp_path):
    # A convention-prefix READ must not redirect onto the CWD when the mapped target
    # is absent -- that masks a genuine missing-input error and could serve an
    # unrelated same-basename workdir file. It heals only when the mapped CWD target
    # exists, so re-reading an artifact an earlier write produced still works.
    mod = _load_shim()
    monkeypatch.chdir(tmp_path)
    cwd = os.getcwd()

    # Mapped target absent: read keeps the original path (truthful miss).
    assert mod._remap_open("/mnt/data/input.csv", "r") == "/mnt/data/input.csv"
    with pytest.raises(FileNotFoundError):
        open(mod._remap_open("/mnt/data/input.csv", "r"))

    # r+ (never creates) behaves the same: no redirect while absent.
    assert mod._remap_open("/mnt/data/input.csv", "r+") == "/mnt/data/input.csv"

    # A write heals onto the CWD and creates the artifact...
    mapped = mod._remap_open("/mnt/data/input.csv", "w")
    assert mapped == os.path.join(cwd, "input.csv")
    with open(mapped, "w") as fh:
        fh.write("col\n1\n")

    # ...and now a READ of the same convention path heals onto that existing artifact.
    read_target = mod._remap_open("/mnt/data/input.csv", "r")
    assert read_target == os.path.join(cwd, "input.csv")
    with open(read_target) as fh:
        assert fh.read() == "col\n1\n"


def test_prefix_boundary_not_matched_by_similar_paths(monkeypatch, tmp_path):
    # The prefix match is anchored on a segment boundary (prefix or prefix + '/'), so
    # a sibling merely sharing the textual prefix must NOT be remapped: /workspace2
    # is not /workspace, /mnt/database is not /mnt/data.
    mod = _load_shim()
    monkeypatch.chdir(tmp_path)
    for unrelated in ("/workspace2/file.txt", "/mnt/database/x", "/home/sandboxed/y"):
        assert mod._remap(unrelated) == unrelated
        # And through open() for a read too (no silent redirect).
        assert mod._remap_open(unrelated, "r") == unrelated


def test_tmp_outputs_is_a_conditional_prefix():
    mod = _load_shim()
    assert "/tmp/outputs" in mod._CONDITIONAL_PREFIXES
    # NOT in the always-remap set: /tmp exists on the host, so an unconditional remap
    # could shadow a real /tmp/outputs the user code made.
    assert "/tmp/outputs" not in mod._PREFIXES


def test_tmp_outputs_remapped_only_while_absent(monkeypatch, tmp_path):
    mod = _load_shim()
    monkeypatch.chdir(tmp_path)
    cwd = os.getcwd()
    # Point the conditional prefix at a real temp location so we can toggle its
    # existence on disk instead of mocking os.path.exists.
    cond = str(tmp_path / "cond_outputs")
    monkeypatch.setattr(mod, "_CONDITIONAL_PREFIXES", (cond,))

    # Absent: heal the habit path into the working directory (preserved/served).
    assert not os.path.exists(cond)
    assert mod._remap(cond + "/plot.png") == os.path.join(cwd, "plot.png")
    assert mod._remap(cond) == cwd

    # Present (the user's own code created it): pass through, never shadowed.
    os.makedirs(cond)
    assert mod._remap(cond + "/plot.png") == cond + "/plot.png"
    assert mod._remap(cond) == cond


def test_pathlib_mkdir_parents_remaps_convention_path(monkeypatch, tmp_path):
    # `Path('/mnt/data').mkdir(parents=True, exist_ok=True)` is a stock setup line.
    # pathlib drives it through os.mkdir per component and Path.is_dir()/os.stat on
    # FileExistsError, so the shim must patch os.mkdir AND Path.mkdir for the whole
    # parents/exist_ok dance to land in the CWD instead of raising. Keeps the mkdir
    # patches installed under a chdir into tmp_path and restores them in finally.
    saved = _save_patch_targets()
    spec = importlib.util.spec_from_file_location("_tool_sitecustomize_mkdir", _SHIM)
    mod = importlib.util.module_from_spec(spec)
    monkeypatch.chdir(tmp_path)
    cwd = os.getcwd()
    try:
        spec.loader.exec_module(mod)  # installs the os.mkdir / Path.mkdir patches
        mod._notified = True
        prefix = str(tmp_path / "mnt_data").replace("\\", "/")
        mod._PREFIXES = (prefix,)
        mod._CONDITIONAL_PREFIXES = ()
        # Bare convention path maps onto the CWD, which already exists: exist_ok=True
        # must be honoured against the mapped location, not raise.
        pathlib.Path(prefix).mkdir(parents = True, exist_ok = True)
        # A nested convention path is created inside the CWD, parents and all.
        pathlib.Path(prefix + "/plots/run1").mkdir(parents = True, exist_ok = True)
        assert os.path.isdir(os.path.join(cwd, "plots", "run1"))
        # Idempotent: exist_ok is evaluated on the mapped path (which now exists),
        # not the never-present prefix.
        pathlib.Path(prefix + "/plots/run1").mkdir(parents = True, exist_ok = True)

        # Passthrough: real paths are created verbatim through both patches,
        # never remapped into the CWD.
        real_dir = tmp_path / "real_via_path"
        pathlib.Path(str(real_dir)).mkdir()
        assert real_dir.is_dir()
        real_os = tmp_path / "real_via_os"
        os.mkdir(str(real_os))
        assert real_os.is_dir()
    finally:
        _restore_patch_targets(saved)


def test_read_of_missing_prefix_path_emits_no_notice(monkeypatch, tmp_path, capsys):
    # A read of a missing convention path keeps the original path and must not spend
    # the one-shot notice; a genuine remap afterward still notifies.
    mod = _load_shim()
    monkeypatch.chdir(tmp_path)
    mod._notified = False  # re-arm the one-shot notice for this test
    # Read of a missing prefixed path: original kept, no notice, flag unspent.
    assert mod._remap_open("/mnt/data/missing.csv", "r") == "/mnt/data/missing.csv"
    assert mod._notified is False
    assert "does not exist" not in capsys.readouterr().err
    # A committed write then heals and fires the notice exactly once.
    assert mod._remap_open("/mnt/data/out.txt", "w") == os.path.join(os.getcwd(), "out.txt")
    assert mod._notified is True
    assert "/mnt/data does not exist here" in capsys.readouterr().err


def test_os_open_trunc_without_creat_missing_stays_truthful(monkeypatch, tmp_path):
    # O_TRUNC / O_APPEND without O_CREAT cannot create a missing file, so the shim
    # treats them as a read: a missing convention path stays truthful (the error
    # names the caller's path) and nothing is created in the CWD.
    saved = _save_patch_targets()
    spec = importlib.util.spec_from_file_location("_tool_sitecustomize_trunc", _SHIM)
    mod = importlib.util.module_from_spec(spec)
    monkeypatch.chdir(tmp_path)
    try:
        spec.loader.exec_module(mod)
        mod._notified = True
        with pytest.raises(FileNotFoundError) as exc:
            os.open("/mnt/data/missing_xyz.bin", os.O_WRONLY | os.O_TRUNC)
        assert exc.value.filename == "/mnt/data/missing_xyz.bin"
        assert not os.path.exists(os.path.join(os.getcwd(), "missing_xyz.bin"))
    finally:
        _restore_patch_targets(saved)
