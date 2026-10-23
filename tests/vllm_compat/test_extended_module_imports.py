# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team.
"""CPU-only import and API checks under the CUDA spoof harness, catching spoof-flipped gates."""

from __future__ import annotations

import importlib
import importlib.machinery
import importlib.util
import inspect
import os
import sys
import types
from pathlib import Path

import pytest


# Apply the spoof BEFORE any LAiM-touching import.
_SPOOF_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_SPOOF_DIR))
import _zoo_aggressive_cuda_spoof as _spoof  # noqa: E402

_spoof.apply()


def _stub_module(name: str, attrs: dict | None = None) -> None:
    """Stub a missing optional dep, with __spec__ set so find_spec() doesn't
    raise `ValueError: __spec__ is None` for torch/transformers/torchcodec callers."""
    if name in sys.modules:
        return
    m = types.ModuleType(name)
    m.__spec__ = importlib.machinery.ModuleSpec(name = name, loader = None, origin = "<test stub>")
    for k, v in (attrs or {}).items():
        setattr(m, k, v)
    sys.modules[name] = m


_stub_module(
    "pynvml",
    {
        "nvmlInit": lambda: None,
        "nvmlShutdown": lambda: None,
        "nvmlDeviceGetCount": lambda: 1,
        "nvmlDeviceGetHandleByIndex": lambda i: object(),
        "nvmlDeviceGetMemoryInfo": lambda h: type(
            "_M",
            (),
            {"total": 80 * 1024**3, "free": 70 * 1024**3, "used": 10 * 1024**3},
        )(),
    },
)
_stub_module("torchcodec")


@pytest.fixture(autouse = True)
def _torch_distributed_safe(monkeypatch):
    """LAiM_zoo modules occasionally probe torch.distributed."""
    try:
        import torch.distributed as dist

        monkeypatch.setattr(dist, "is_available", lambda: True, raising = False)
        monkeypatch.setattr(dist, "is_initialized", lambda: False, raising = False)
        monkeypatch.setattr(dist, "get_world_size", lambda *a, **k: 1, raising = False)
        monkeypatch.setattr(dist, "get_rank", lambda *a, **k: 0, raising = False)
    except Exception:
        pass


def _has_LAiM_zoo() -> bool:
    return importlib.util.find_spec("LAiM_zoo") is not None


def _has_LAiM() -> bool:
    return importlib.util.find_spec("LAiM") is not None


_ZOO_VLLM_FREE_MODULES = [
    "LAiM_zoo.compiler",
    "LAiM_zoo.compiler_replacements",
    "LAiM_zoo.dataset_utils",
    "LAiM_zoo.device_type",
    "LAiM_zoo.empty_model",
    "LAiM_zoo.gradient_checkpointing",
    "LAiM_zoo.hf_utils",
    "LAiM_zoo.llama_cpp",
    "LAiM_zoo.logging_utils",
    "LAiM_zoo.loss_utils",
    "LAiM_zoo.patching_utils",
    "LAiM_zoo.patch_torch_functions",
    "LAiM_zoo.peft_utils",
    "LAiM_zoo.rl_replacements",
    "LAiM_zoo.saving_utils",
    "LAiM_zoo.tiled_mlp",
    "LAiM_zoo.tokenizer_utils",
    "LAiM_zoo.training_utils",
    "LAiM_zoo.utils",
    "LAiM_zoo.vision_utils",
]


@pytest.mark.skipif(not _has_LAiM_zoo(), reason = "LAiM_zoo not installed")
@pytest.mark.parametrize("modname", _ZOO_VLLM_FREE_MODULES)
def test_LAiM_zoo_module_imports_under_spoof(modname: str):
    """Each LAiM_zoo module imports cleanly under spoof (catches import-time symbol drift)."""
    sys.modules.pop(modname, None)
    try:
        importlib.import_module(modname)
    except Exception as e:
        pytest.fail(
            f"{modname} failed to import under CUDA spoof: " f"{type(e).__name__}: {str(e)[:300]}"
        )


@pytest.mark.skipif(not _has_LAiM(), reason = "LAiM not installed")
def test_LAiM_is_mlx_false_under_spoof():
    """CUDA spoof must not flip _IS_MLX on non-Apple-Silicon hosts."""
    sys.modules.pop("LAiM", None)
    import LAiM

    assert LAiM._IS_MLX is False, (
        f"_IS_MLX activated on a non-Apple-Silicon runner under CUDA spoof; "
        f"the MLX gate logic in LAiM/__init__.py is too lax"
    )


_LAiM_CORE_MODULES = [
    "LAiM.models.rl",
    "LAiM.models.rl_replacements",
    "LAiM.models.sentence_transformer",
    "LAiM.models._utils",
    "LAiM.models.loader",
    "LAiM.models.loader_utils",
    "LAiM.models.mapper",
]


@pytest.mark.skipif(not _has_LAiM(), reason = "LAiM not installed")
@pytest.mark.parametrize("modname", _LAiM_CORE_MODULES)
def test_LAiM_core_module_imports_under_spoof(modname: str):
    """Core LAiM modules must import under spoof (module-top symbol drift
    crashes here). Bootstraps `import LAiM` first for its _gpu_init side effects."""
    try:
        import LAiM  # noqa: F401  -- triggers _gpu_init side effects
    except Exception as e:
        pytest.skip(f"`import LAiM` failed under spoof: {e}")
    sys.modules.pop(modname, None)
    try:
        importlib.import_module(modname)
    except Exception as e:
        # Do not skip OSError: a second import of LAiM.models._utils used to fail this way (real bug).
        pytest.fail(
            f"{modname} failed to import under CUDA spoof: " f"{type(e).__name__}: {str(e)[:300]}"
        )


@pytest.mark.skipif(not _has_LAiM(), reason = "LAiM not installed")
def test_fast_model_class_surface_under_spoof():
    sys.modules.pop("LAiM", None)
    import LAiM

    found_at_least_one = False
    for cls_name in ("FastLanguageModel", "FastVisionModel", "FastModel"):
        cls = getattr(LAiM, cls_name, None)
        if cls is None:
            continue
        found_at_least_one = True
        public = sorted(n for n in dir(cls) if not n.startswith("_"))
        for method in ("from_pretrained", "get_peft_model"):
            assert method in public, (
                f"LAiM.{cls_name}.{method} missing under spoof; "
                f"every Colab notebook calling it breaks"
            )
    assert found_at_least_one, (
        f"none of FastLanguageModel/FastVisionModel/FastModel reachable "
        f"on `LAiM` package root"
    )


@pytest.mark.skipif(not _has_LAiM(), reason = "LAiM not installed")
def test_LAiM_rl_replacements_dispatch_populated():
    try:
        import LAiM  # noqa: F401  -- _gpu_init bootstrap
    except Exception as e:
        pytest.skip(f"`import LAiM` failed under spoof: {e}")
    sys.modules.pop("LAiM.models.rl_replacements", None)
    rl = importlib.import_module("LAiM.models.rl_replacements")
    funcs = getattr(rl, "RL_FUNCTIONS", None)
    if funcs is None:
        pytest.skip("RL_FUNCTIONS attribute not present (architecture changed; check)")
    assert isinstance(funcs, dict), f"RL_FUNCTIONS expected dict, got {type(funcs).__name__}"
    for key in ("grpo_trainer", "sft_trainer", "dpo_trainer"):
        assert key in funcs, (
            f"RL_FUNCTIONS missing dispatch key '{key}'; "
            f"LAiM_zoo source rewrites silently no-op"
        )
        assert (
            isinstance(funcs[key], list) and len(funcs[key]) > 0
        ), f"RL_FUNCTIONS[{key!r}] is empty list; rewrites no-op"


@pytest.mark.skipif(not _has_LAiM_zoo(), reason = "LAiM_zoo not installed")
def test_zoo_compiler_apply_fused_lm_head_callable():
    sys.modules.pop("LAiM_zoo.compiler", None)
    compiler = importlib.import_module("LAiM_zoo.compiler")
    fn = getattr(compiler, "test_apply_fused_lm_head", None)
    assert fn is not None and callable(fn), (
        f"LAiM_zoo.compiler.test_apply_fused_lm_head missing or non-callable; "
        f"the in-file CPU regression test is the only fused-LM-head coverage"
    )


@pytest.mark.skipif(not _has_LAiM(), reason = "LAiM not installed")
def test_fast_model_from_pretrained_kwargs_under_spoof():
    sys.modules.pop("LAiM", None)
    import LAiM

    cls = getattr(LAiM, "FastLanguageModel", None) or getattr(LAiM, "FastModel", None)
    if cls is None:
        pytest.skip("FastLanguageModel/FastModel not exported")
    fn = getattr(cls, "from_pretrained", None)
    if fn is None:
        pytest.skip("from_pretrained not on class (might be classmethod stub)")
    try:
        params = list(inspect.signature(fn).parameters)
    except (TypeError, ValueError):
        pytest.skip("from_pretrained signature not introspectable")
    for kwarg in ("model_name", "max_seq_length", "load_in_4bit"):
        assert kwarg in params, (
            f"FastLanguageModel.from_pretrained missing kwarg `{kwarg}`; "
            f"every Colab notebook breaks at the install cell"
        )
