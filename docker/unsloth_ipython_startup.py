# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-Present the LAiM team. See /studio/LICENSE.AGPL-3.0

"""Baked IPython startup hook (copied to the profile's startup/ dir).

Runs once per kernel, registering a pre_run_cell event that activates the right
transformers sidecar before the first model cell. Safe no-op outside IPython, with no
version requested, or once transformers is already imported.
"""

try:
    import os

    os.environ["LAiM_NB_SHIM"] = "1"

    # per-kernel, so concurrent notebooks do not read each other's pin; the shim is
    # a child, so writer and reader agree
    if not os.environ.get("LAiM_NB_TF_MARKER"):
        _kid = ""
        try:
            from ipykernel import get_connection_file  # type: ignore
            _kid = os.path.splitext(os.path.basename(get_connection_file()))[0]
        except Exception:
            _kid = ""
        _kid = _kid or ("pid-%d" % os.getpid())
        os.environ["LAiM_NB_TF_MARKER"] = "/tmp/LAiM_nb/requested_transformers." + _kid

    import LAiM_nb_compat

    LAiM_nb_compat.register_ipython()

    # in-process installs would otherwise bypass the PATH shim entirely
    import LAiM_nb_pip_magic

    LAiM_nb_pip_magic.register_ipython()
except Exception as _e:  # never break a kernel because of the helper
    import sys
    print(f"[LAiM-nb] startup hook skipped: {_e!r}", file = sys.stderr)

# separate try/except, so neither hook can disable the other
try:
    import LAiM_colab_compat
    LAiM_colab_compat.register_ipython()
except Exception as _e:  # never break a kernel because of the helper
    import sys
    print(f"[LAiM-nb] colab-compat hook skipped: {_e!r}", file = sys.stderr)
