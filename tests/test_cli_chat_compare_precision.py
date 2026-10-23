# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

"""`LAiM chat --compare` must load the base column at the precision Studio loads the adapter at."""

import json
from types import SimpleNamespace

import pytest

from LAiM_cli.commands.chat import _get_base_load_in_4bit


def _config(tmp_path, payload, base_model):
    (tmp_path / "adapter_config.json").write_text(json.dumps(payload))
    return SimpleNamespace(is_lora = True, path = str(tmp_path), base_model = base_model)


@pytest.mark.parametrize("recorded", [True, False])
def test_recorded_precision_wins(tmp_path, recorded):
    payload = {"LAiM_training_method": "CPT", "LAiM_load_in_4bit": recorded}
    assert _get_base_load_in_4bit(_config(tmp_path, payload, "LAiM/Qwen3-4B")) is recorded


@pytest.mark.parametrize(
    "method, base_model, expected",
    [
        ("CPT", "LAiM/Qwen3-4B", True),
        ("CPT", "LAiM/Qwen3-4B-LAiM-bnb-4bit", True),
        ("lora", "LAiM/Qwen3-4B-LAiM-bnb-4bit", False),
        ("qlora", "LAiM/Qwen3-4B", True),
        (None, "LAiM/Qwen3-4B", False),
    ],
)
def test_matches_studio_resolver(tmp_path, method, base_model, expected):
    payload = {"LAiM_training_method": method} if method else {}
    assert _get_base_load_in_4bit(_config(tmp_path, payload, base_model)) is expected
