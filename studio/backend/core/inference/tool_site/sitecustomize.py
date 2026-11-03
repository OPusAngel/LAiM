# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

"""Compatibility shim for ChatGPT code-interpreter habit paths.

Models habitually write to /mnt/data (or /mnt/outputs, /home/sandbox,
/workspace), none of which exist on the machine this app runs on. This module
sits on the tool subprocess PYTHONPATH (see ``tools._build_bypass_env``), so it
loads at interpreter startup in every ``python`` run and any Python the
``terminal`` tool launches.

It remaps only those convention prefixes onto the CWD in ``open`` / ``io.open``,
``os.open``, ``os.makedirs`` / ``os.mkdir`` and ``pathlib.Path.mkdir``. A
write/create to a convention prefix heals onto the CWD; a READ heals only when
the mapped target already exists (re-reading an earlier write), so a genuinely
missing input stays truthful on the path the model used.

Every other path is left exactly as written. There used to be a fallback that
redirected any absolute write path whose parent was missing onto the basename
in the CWD; it made a model that asked for an invented directory (or a
hallucinated user profile) believe it had written where it asked, and left an
``.LAiM_remap.json`` sidecar behind. A missing directory is now the
normal ``FileNotFoundError``, which the agent can see and correct.

The patch set (io.open, os.open, os.mkdir, Path.mkdir, and the <3.11
``_NormalAccessor.open``) covers the low-level entry points pathlib routes
through. A one-line stderr notice fires on the first remap, and everything is
wrapped in try/except so a failure never breaks the interpreter.

Identical with and without output streaming because the child env is.
"""

import builtins
import io
import os
import sys

# Code-interpreter convention prefixes. Remapping is gated on the prefix being ABSENT (see _remap) so a genuine host
# mount / user dir is never shadowed.
_PREFIXES = ("/mnt/data", "/mnt/outputs", "/home/sandbox", "/workspace")
# /tmp exists on the host; separate only to note that. The absence gate applies alike.
_CONDITIONAL_PREFIXES = ("/tmp/outputs",)
_notified = False


def _note(subject, original, mapped):
    """Print the one-shot stderr notice so the model learns the real location.

    ``subject`` is what "does not exist" (the prefix); ``original`` is echoed in
    the ``(original -> mapped)`` tail.
    """
    global _notified
    if _notified:
        return
    _notified = True
    print(
        f"note: {subject} does not exist here; "
        f"using the working directory instead ({original} -> {mapped})",
        file = sys.stderr,
    )


def _contained_join(cwd, rel):
    """Join ``rel`` onto ``cwd`` so the result can never escape ``cwd``.

    A habit path can carry ``..`` segments; joining verbatim would let the target
    climb above the workspace. ``..`` components are dropped and empty / ``.``
    ones ignored, keeping the result under ``cwd``.
    """
    parts = []
    for part in rel.split("/"):
        if part == "" or part == ".":
            continue
        if part == "..":
            if parts:
                parts.pop()
            continue
        parts.append(part)
    return os.path.join(cwd, *parts) if parts else cwd


def _map_onto_cwd(
    prefix,
    text,
    notify = True,
):
    """Map ``<prefix>/rest`` onto ``./rest`` in the CWD, noting it once.

    The suffix is contained under the CWD (see ``_contained_join``) so a path
    like ``/mnt/data/../other_session/file`` cannot escape the workdir.
    ``notify`` is False when the caller may keep the original path (a read), so
    the one-shot notice is not spent on a remap that never happens.
    """
    rel = text[len(prefix) :].lstrip("/")
    mapped = _contained_join(os.getcwd(), rel)
    if notify:
        _note(prefix, text, mapped)
    return mapped


def _is_creating_mode(mode):
    """True only when an ``open()`` mode string can CREATE a missing file.

    Only ``w`` / ``a`` / ``x`` create. ``r+`` / ``rb+`` require the path to exist,
    so they behave as a read (``w+`` / ``a+`` / ``x+`` still match).
    """
    return isinstance(mode, str) and any(c in mode for c in ("w", "a", "x"))


def _remap_open(file, mode):
    """Remap for ``open()`` / ``io.open()``.

    A prefix remap runs first: a write/create heals onto the CWD; a READ heals
    only when the mapped target already exists (re-reading an earlier write),
    else the original path is kept so a genuine missing input fails truthfully
    instead of silently reading a same-basename workdir file. Every other path,
    including an invented absolute one, is returned unchanged.
    """
    creating = _is_creating_mode(mode)
    # notify=False: emit the notice only once we commit to the mapping below.
    mapped = _remap(file, notify = False)
    if mapped is file:
        return file
    # Write always heals; a read only when the mapped target exists (else keep the original path so a missing input
    # stays truthful).
    if creating or os.path.exists(mapped):
        # Commit: emit the notice now (the notify=False peek above deferred it).
        _remap(file, notify = True)
        return mapped
    return file


def _remap(path, notify = True):
    """Map ``<prefix>/rest`` onto ``./rest`` in the CWD; other paths pass through.

    ``notify`` is forwarded to ``_map_onto_cwd``; ``_remap_open`` passes False so
    a read that keeps its original path emits no false notice. Matching is done on
    the forward-slash spelling because that is how models write these prefixes, and
    pathlib on Windows normalises the same path to backslashes before it reaches us.
    """
    try:
        text = os.fspath(path)
    except TypeError:
        return path
    if not isinstance(text, str):
        return path
    probe = text.replace("\\", "/") if "\\" in text else text
    for prefix in _PREFIXES + _CONDITIONAL_PREFIXES:
        spelling = prefix.replace("\\", "/")
        # Heal only while the real prefix directory is absent, so a genuine host mount / user directory at that prefix
        # is never shadowed.
        if (probe == spelling or probe.startswith(spelling + "/")) and not os.path.exists(prefix):
            return _map_onto_cwd(spelling, probe, notify = notify)
    return path


def _install():
    import pathlib

    original_open = builtins.open
    original_io_open = io.open
    original_os_open = os.open
    original_makedirs = os.makedirs
    original_mkdir = os.mkdir
    original_path_mkdir = pathlib.Path.mkdir

    def _open(
        file,
        mode = "r",
        *args,
        **kwargs,
    ):
        return original_open(_remap_open(file, mode), mode, *args, **kwargs)

    def _io_open(
        file,
        mode = "r",
        *args,
        **kwargs,
    ):
        return original_io_open(_remap_open(file, mode), mode, *args, **kwargs)

    # mkdir/makedirs get only the prefix remap, never a fallback: an arbitrary absolute directory can legitimately
    # succeed on the host.
    def _makedirs(name, *args, **kwargs):
        return original_makedirs(_remap(name), *args, **kwargs)

    def _mkdir(path, *args, **kwargs):
        return original_mkdir(_remap(path), *args, **kwargs)

    def _os_open(
        path,
        flags,
        mode = 0o777,
        *,
        dir_fd = None,
    ):
        # Path.touch() etc. go through os.open, not builtins.open. Only O_CREAT can create, so only it maps to
        # "creating" mode; O_TRUNC / O_APPEND without O_CREAT still require the file to exist, so behave as a read.
        logical_mode = "w" if (flags & os.O_CREAT) else "r"
        mapped = _remap_open(path, logical_mode)
        if dir_fd is None:
            return original_os_open(mapped, flags, mode)
        return original_os_open(mapped, flags, mode, dir_fd = dir_fd)

    def _path_mkdir(self, *args, **kwargs):
        # pathlib probes Path.is_dir()/os.stat (unpatched) on FileExistsError, so a bare os.mkdir remap would still
        # raise when the target exists. Remap the receiver up front so parents/exist_ok stays idempotent.
        mapped = _remap(self)
        target = self if mapped is self else self.__class__(mapped)
        return original_path_mkdir(target, *args, **kwargs)

    builtins.open = _open
    # pathlib.Path.open / write_text / read_text call io.open directly, so patch both.
    io.open = _io_open
    # Python < 3.11 only: pathlib's accessor captured the ORIGINAL io.open at import (``_NormalAccessor.open =
    # io.open``), so the io.open patch misses it. Repoint it at the same wrapper (staticmethod to stay unbound); 3.11+
    # dropped the accessor, so this is a no-op there.
    accessor = getattr(pathlib, "_NormalAccessor", None)
    if accessor is not None and hasattr(accessor, "open"):
        accessor.open = staticmethod(_io_open)
    # Path.touch() and other low-level opens call os.open directly, so patch it too.
    os.open = _os_open
    os.makedirs = _makedirs
    # Path.mkdir(parents=True) calls os.mkdir per component, so patch os.mkdir; patch Path.mkdir itself too so
    # exist_ok/parents land on the mapped path.
    os.mkdir = _mkdir
    pathlib.Path.mkdir = _path_mkdir


try:
    _install()
except Exception:  # noqa: BLE001 - a broken shim must never break user code
    pass
