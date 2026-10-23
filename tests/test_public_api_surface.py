# LAiM - 2x faster, 60% less VRAM LLM training and finetuning
# Copyright 2023-present Daniel Han-Chen, Michael Han-Chen & the LAiM team. All rights reserved.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Lesser General Public License for more details.

"""Drift detectors for the public API the notebooks call, so a rename or dropped kwarg fails."""

from __future__ import annotations

import inspect

import pytest


def _signature_param_names(callable_obj) -> set[str]:
    try:
        sig = inspect.signature(callable_obj)
    except (TypeError, ValueError):
        return set()
    return set(sig.parameters)


def _accepts(callable_obj, kwargs: set[str]) -> tuple[bool, set[str]]:
    """(ok, missing): True if every kwarg is a named param or the signature has **kwargs."""
    try:
        sig = inspect.signature(callable_obj)
    except (TypeError, ValueError):
        return True, set()
    params = sig.parameters
    has_var_kw = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in params.values())
    if has_var_kw:
        return True, set()
    missing = kwargs - set(params)
    return (not missing), missing


def test_fast_language_model_class_present():
    LAiM = pytest.importorskip("LAiM")
    if not hasattr(LAiM, "FastLanguageModel"):
        pytest.fail(
            "DRIFT DETECTED: LAiM.FastLanguageModel is missing; every "
            "LoRA notebook fails at the first import cell."
        )


def test_fast_language_model_from_pretrained_kwargs():
    """from_pretrained must accept the canonical kwargs the notebooks pass."""
    LAiM = pytest.importorskip("LAiM")
    required = {"model_name", "max_seq_length", "dtype", "load_in_4bit"}
    ok, missing = _accepts(LAiM.FastLanguageModel.from_pretrained, required)
    if not ok:
        pytest.fail(
            f"DRIFT DETECTED: FastLanguageModel.from_pretrained dropped "
            f"kwargs {sorted(missing)}; 506 notebook call sites would "
            f"crash with TypeError."
        )


def test_fast_language_model_get_peft_model_kwargs():
    LAiM = pytest.importorskip("LAiM")
    required = {
        "r",
        "lora_alpha",
        "lora_dropout",
        "target_modules",
        "bias",
        "use_gradient_checkpointing",
        "random_state",
    }
    ok, missing = _accepts(LAiM.FastLanguageModel.get_peft_model, required)
    if not ok:
        pytest.fail(
            f"DRIFT DETECTED: FastLanguageModel.get_peft_model dropped "
            f"kwargs {sorted(missing)}; 304 notebook call sites would crash."
        )


def test_fast_language_model_for_inference_callable():
    LAiM = pytest.importorskip("LAiM")
    if not callable(getattr(LAiM.FastLanguageModel, "for_inference", None)):
        pytest.fail(
            "DRIFT DETECTED: FastLanguageModel.for_inference is missing; "
            "370 inference-cell call sites would crash."
        )


def test_fast_vision_model_class_and_methods():
    LAiM = pytest.importorskip("LAiM")
    if not hasattr(LAiM, "FastVisionModel"):
        pytest.fail(
            "DRIFT DETECTED: LAiM.FastVisionModel is missing; every "
            "vision fine-tuning notebook fails at import."
        )
    cls = LAiM.FastVisionModel
    missing = [
        m
        for m in ("from_pretrained", "get_peft_model", "for_inference", "for_training")
        if not callable(getattr(cls, m, None))
    ]
    if missing:
        pytest.fail(f"DRIFT DETECTED: FastVisionModel is missing methods {missing}.")


def test_fast_vision_model_get_peft_model_vision_kwargs():
    """Vision-specific kwargs the notebooks pass on the vision LoRA path."""
    LAiM = pytest.importorskip("LAiM")
    required = {
        "finetune_vision_layers",
        "finetune_language_layers",
        "finetune_attention_modules",
        "finetune_mlp_modules",
    }
    ok, missing = _accepts(LAiM.FastVisionModel.get_peft_model, required)
    if not ok:
        pytest.fail(
            f"DRIFT DETECTED: FastVisionModel.get_peft_model dropped "
            f"vision kwargs {sorted(missing)}."
        )


def test_fast_model_class_and_methods():
    LAiM = pytest.importorskip("LAiM")
    if not hasattr(LAiM, "FastModel"):
        pytest.fail(
            "DRIFT DETECTED: LAiM.FastModel is missing; the modern "
            "unified entry point used by 100+ notebooks would crash."
        )
    missing = [
        m
        for m in ("from_pretrained", "get_peft_model")
        if not callable(getattr(LAiM.FastModel, m, None))
    ]
    if missing:
        pytest.fail(f"DRIFT DETECTED: FastModel is missing methods {missing}.")


def test_fast_model_from_pretrained_kwargs():
    LAiM = pytest.importorskip("LAiM")
    required = {"model_name", "max_seq_length", "dtype", "load_in_4bit"}
    ok, missing = _accepts(LAiM.FastModel.from_pretrained, required)
    if not ok:
        pytest.fail(
            f"DRIFT DETECTED: FastModel.from_pretrained dropped kwargs "
            f"{sorted(missing)}; 103 notebook call sites would crash."
        )


def test_is_bf16_supported_or_alias_callable():
    """is_bf16_supported or the legacy is_bfloat16_supported alias must remain importable."""
    LAiM = pytest.importorskip("LAiM")
    has_new = callable(getattr(LAiM, "is_bf16_supported", None))
    has_old = callable(getattr(LAiM, "is_bfloat16_supported", None))
    if not (has_new or has_old):
        pytest.fail(
            "DRIFT DETECTED: neither LAiM.is_bf16_supported nor "
            "LAiM.is_bfloat16_supported is callable; dtype probing "
            "in 50+ notebooks fails."
        )


# FastDecisionModel: decision model (Laya) fine-tuning, called like the other Fast*Model classes.
def test_fast_decision_model_follows_the_fast_model_api():
    LAiM = pytest.importorskip("LAiM")
    if getattr(LAiM, "_IS_MLX", False):
        pytest.skip("FastDecisionModel is a stub on MLX")
    cls = getattr(LAiM, "FastDecisionModel", None)
    if cls is None or not hasattr(LAiM, "DecisionTrainer"):
        pytest.fail(
            "DRIFT DETECTED: LAiM.FastDecisionModel or LAiM.DecisionTrainer is missing."
        )
    methods = [
        m
        for m in ("from_pretrained", "get_peft_model", "for_inference", "for_training")
        if not callable(getattr(cls, m, None))
    ]
    load = {"model_name", "max_seq_length", "dtype", "load_in_4bit", "full_finetuning"}
    peft = {
        "r",
        "lora_alpha",
        "lora_dropout",
        "target_modules",
        "bias",
        "use_gradient_checkpointing",
    }
    load -= _signature_param_names(getattr(cls, "from_pretrained", None))
    peft -= _signature_param_names(getattr(cls, "get_peft_model", None))
    if methods or load or peft:
        pytest.fail(
            f"DRIFT DETECTED: FastDecisionModel is missing methods {methods}, from_pretrained "
            f"kwargs {sorted(load)} or get_peft_model kwargs {sorted(peft)}."
        )
