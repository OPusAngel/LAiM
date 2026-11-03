# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

"""Keep the engine's split env spellings in sync. Stdlib-only, so it can run before torch.

The installed engine is two distributions that disagree on the name of the same knob: the
``LAiM`` package reads ``LAiM_*`` while ``LAiM_zoo`` reads ``UNSLOTH_*``. Setting one
spelling configures only one half -- ``LAiM_zoo/__init__.py`` raises
``ImportError("Please install Unsloth...")`` unless ``UNSLOTH_IS_PRESENT`` is in the
environment, while ``LAiM/__init__.py`` only ever exports ``LAiM_IS_PRESENT``.

Every pair here is a name both sides were verified to read. Mirroring is additive: a value
that is already set is never overwritten, only copied to the spelling that is still unset.
"""

from __future__ import annotations

import os

ALIASES = {
    "LAiM_ALLOW_CPU": "UNSLOTH_ALLOW_CPU",
    "LAiM_DATASET_NUM_PROC": "UNSLOTH_DATASET_NUM_PROC",
    "LAiM_ENABLE_LOGGING": "UNSLOTH_ENABLE_LOGGING",
    "LAiM_IS_PRESENT": "UNSLOTH_IS_PRESENT",
    "LAiM_LLAMA_CPP_CONVERTER_TAG": "UNSLOTH_LLAMA_CPP_CONVERTER_TAG",
    "LAiM_LLAMA_CPP_PATH": "UNSLOTH_LLAMA_CPP_PATH",
    "LAiM_LLAMA_CPP_SCRIPTS_DIR": "UNSLOTH_LLAMA_CPP_SCRIPTS_DIR",
    "LAiM_PATCHED": "UNSLOTH_PATCHED",
}


def mirror_library_env(env: dict | None = None) -> dict:
    """Copy every split knob to the other spelling, in both directions. Pass a child
    process's env dict to mirror what that child will see."""
    target = os.environ if env is None else env
    for package_name, zoo_name in ALIASES.items():
        for source, destination in ((package_name, zoo_name), (zoo_name, package_name)):
            value = target.get(source)
            if value is not None and target.get(destination) is None:
                target[destination] = value
    return target
