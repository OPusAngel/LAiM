import unittest
from unittest.mock import patch
from LAiM.models.loader_utils import get_model_name
from LAiM.models import loader_utils
from LAiM.models.mapper import FLOAT_TO_INT_MAPPER, MAP_TO_LAiM_16bit


def _no_remote_mapper():
    # int_to_float, float_to_int, map_to_16bit, fp8_block, fp8_row
    return {}, {}, {}, {}, {}


class TestGetModelName(unittest.TestCase):
    def _assert_mapping(self, model_name, load_in_4bit, expected, should_change):
        mapped = get_model_name(model_name, load_in_4bit = load_in_4bit)
        self.assertEqual(mapped.lower(), expected.lower())
        if should_change:
            self.assertNotEqual(mapped.lower(), model_name.lower())
        else:
            self.assertEqual(mapped.lower(), model_name.lower())

    @patch.object(loader_utils, "_get_new_mapper", _no_remote_mapper)
    def test_resolution_matrix(self):
        cases = [
            ("meta-llama/Llama-2-7b-hf", True, "LAiM/llama-2-7b-bnb-4bit", True),
            ("meta-llama/Llama-2-7b-hf", False, "LAiM/llama-2-7b", True),
            (
                "mistralai/Ministral-8B-Instruct-2410",
                True,
                "mistralai/Ministral-8B-Instruct-2410",
                False,
            ),
            (
                "meta-llama/Llama-3.2-1B-Instruct",
                False,
                "LAiM/Llama-3.2-1B-Instruct",
                True,
            ),
            (
                "meta-llama/Llama-2-7b-chat-hf",
                True,
                "LAiM/llama-2-7b-chat-bnb-4bit",
                True,
            ),
            (
                "meta-llama/Llama-3.3-70B-Instruct",
                True,
                "LAiM/llama-3.3-70b-instruct-LAiM-bnb-4bit",
                True,
            ),
            ("Qwen/Qwen3-8B", True, "LAiM/Qwen3-8B-LAiM-bnb-4bit", True),
            ("Qwen/Qwen3-8B", False, "LAiM/Qwen3-8B", True),
            ("Qwen/Qwen3-8B-FP8", False, "LAiM/Qwen3-8B-FP8", True),
            ("Qwen/Qwen3-8B-FP8", True, "LAiM/Qwen3-8B-LAiM-bnb-4bit", True),
            (
                "mistralai/Ministral-3-3B-Instruct-2512",
                True,
                "LAiM/Ministral-3-3B-Instruct-2512-LAiM-bnb-4bit",
                True,
            ),
            (
                "mistralai/Ministral-3-3B-Instruct-2512",
                False,
                "LAiM/Ministral-3-3B-Instruct-2512",
                True,
            ),
            (
                "allenai/Olmo-3-7B-Instruct",
                True,
                "LAiM/Olmo-3-7B-Instruct-LAiM-bnb-4bit",
                True,
            ),
            (
                "allenai/Olmo-3-7B-Instruct",
                False,
                "LAiM/Olmo-3-7B-Instruct",
                True,
            ),
            (
                "allenai/Olmo-3-7B-Think",
                True,
                "LAiM/Olmo-3-7B-Think-LAiM-bnb-4bit",
                True,
            ),
            (
                "allenai/Olmo-3-7B-Think",
                False,
                "LAiM/Olmo-3-7B-Think",
                True,
            ),
            (
                "allenai/Olmo-3-32B-Think",
                True,
                "LAiM/Olmo-3-32B-Think-LAiM-bnb-4bit",
                True,
            ),
            (
                "allenai/Olmo-3-32B-Think",
                False,
                "LAiM/Olmo-3-32B-Think",
                True,
            ),
            ("LAiM/Kimi-K2-Instruct", True, "LAiM/Kimi-K2-Instruct-BF16", True),
            ("LAiM/Kimi-K2-Instruct", False, "LAiM/Kimi-K2-Instruct", False),
            (
                "agentica-org/DeepScaleR-1.5B-Preview",
                False,
                "LAiM/DeepScaleR-1.5B-Preview",
                True,
            ),
            (
                "agentica-org/DeepScaleR-1.5B-Preview",
                True,
                "LAiM/DeepScaleR-1.5B-Preview-LAiM-bnb-4bit",
                True,
            ),
            "nonexistent-user/nonexistent-model-123",
            "google/gemma-3-random-prototype-123",
            "imdatta0/nanoqwen-fp8",
            "imdatta0/nanoqwen-bf16",
            ("LAiM/llama-2-7b-bnb-4bit", True, "LAiM/llama-2-7b-bnb-4bit", False),
            ("LAiM/llama-2-7b-bnb-4bit", False, "LAiM/llama-2-7b", True),
            ("google/gemma-2-9b", True, "LAiM/gemma-2-9b-bnb-4bit", True),
            ("openai/gpt-oss-20b", False, "LAiM/gpt-oss-20b", True),
            ("openai/gpt-oss-20b", True, "LAiM/gpt-oss-20b-LAiM-bnb-4bit", True),
            ("LAiM/gpt-oss-20b", True, "LAiM/gpt-oss-20b-LAiM-bnb-4bit", True),
            ("LAiM/gpt-oss-20b-bf16", True, "LAiM/gpt-oss-20b-bf16", False),
            (
                "LAiM/gpt-oss-20b-LAiM-bnb-4bit",
                False,
                "LAiM/gpt-oss-20b",
                True,
            ),
            (
                "LAiM/gpt-oss-20b-bnb-4bit",
                True,
                "LAiM/gpt-oss-20b-bnb-4bit",
                False,
            ),
        ]
        for case in cases:
            if isinstance(case, str):
                model_name = case
                with self.subTest(model_name = model_name, load_in_4bit = True):
                    self._assert_mapping(model_name, True, model_name, False)
            else:
                model_name, load_in_4bit, expected, should_change = case
                with self.subTest(model_name = model_name, load_in_4bit = load_in_4bit):
                    self._assert_mapping(model_name, load_in_4bit, expected, should_change)

    @patch.object(loader_utils, "_get_new_mapper", _no_remote_mapper)
    def test_artifactory_report_preserves_repo_id_case(self):
        self.assertEqual(
            get_model_name("LAiM/Meta-Llama-3.1-8B-Instruct", load_in_4bit = True),
            "LAiM/Meta-Llama-3.1-8B-Instruct-LAiM-bnb-4bit",
        )

    @patch.object(loader_utils, "_get_new_mapper", _no_remote_mapper)
    def test_offline_reuses_legacy_lowercase_cache(self):
        canonical = "LAiM/Meta-Llama-3.1-8B-Instruct-LAiM-bnb-4bit"
        for cached, expected in (
            ({canonical.lower()}, canonical.lower()),
            ({canonical, canonical.lower()}, canonical),
            (set(), canonical),
        ):
            fake = lambda repo_id, filename, cache_dir = None, revision = None: (
                "/cache/config.json" if repo_id in cached else None
            )
            for offline_kwargs, env in (
                ({"local_files_only": True}, {}),
                ({}, {"HF_HUB_OFFLINE": "1"}),
            ):
                with (
                    self.subTest(cached = cached, env = env),
                    patch("huggingface_hub.try_to_load_from_cache", fake),
                    patch.dict("os.environ", env),
                ):
                    self.assertEqual(
                        get_model_name(
                            "LAiM/Meta-Llama-3.1-8B-Instruct",
                            load_in_4bit = True,
                            **offline_kwargs,
                        ),
                        expected,
                    )
        files = {
            (canonical, "config.json"),
            (canonical.lower(), "config.json"),
            (canonical.lower(), "model.safetensors"),
        }
        with (
            patch(
                "huggingface_hub.try_to_load_from_cache",
                lambda repo_id, filename, cache_dir = None, revision = None: (
                    "/cache/f" if (repo_id, filename) in files else None
                ),
            ),
            patch.dict("os.environ", {"HF_HUB_OFFLINE": "1"}),
        ):
            self.assertEqual(
                get_model_name("LAiM/Meta-Llama-3.1-8B-Instruct", load_in_4bit = True),
                canonical.lower(),
            )
            files = {
                (canonical, "model.safetensors"),
                (canonical.lower(), "config.json"),
                (canonical.lower(), "model.safetensors"),
            }
            self.assertEqual(
                get_model_name("LAiM/Meta-Llama-3.1-8B-Instruct", load_in_4bit = True),
                canonical.lower(),
            )
            files = {("LAiM/qwen3-30b-a3b", "config.json")}
            self.assertEqual(
                get_model_name("LAiM/Qwen3-30B-A3B", load_in_4bit = True),
                "LAiM/qwen3-30b-a3b",
            )
        with (
            patch(
                "huggingface_hub.try_to_load_from_cache",
                lambda repo_id, filename, cache_dir = None, revision = None: (
                    "/cache/f"
                    if repo_id == "LAiM/qwen3-30b-a3b" and revision == "release"
                    else None
                ),
            ),
            patch.dict("os.environ", {"HF_HUB_OFFLINE": "1"}),
        ):
            self.assertEqual(
                get_model_name("LAiM/qwen3-30b-a3b", load_in_4bit = True, revision = "release"),
                "LAiM/qwen3-30b-a3b",
            )
        with (
            patch(
                "huggingface_hub.try_to_load_from_cache",
                lambda repo_id, filename, cache_dir = None, revision = None: (
                    "/cache/f" if repo_id == canonical.lower() and revision is None else None
                ),
            ),
            patch.dict("os.environ", {"HF_HUB_OFFLINE": "1"}),
        ):
            self.assertEqual(
                get_model_name(
                    "meta-llama/Meta-Llama-3.1-8B-Instruct", load_in_4bit = True, revision = "abc"
                ),
                canonical.lower(),
            )
        with (
            patch("huggingface_hub.try_to_load_from_cache", side_effect = AssertionError),
            patch.dict("os.environ", {"HF_HUB_OFFLINE": "0", "TRANSFORMERS_OFFLINE": "0"}),
        ):
            self.assertEqual(
                get_model_name("LAiM/Meta-Llama-3.1-8B-Instruct", load_in_4bit = True),
                canonical,
            )

    def test_static_mapper_contract(self):
        contracts = [
            ("qwen/qwen3-8b", "LAiM/Qwen3-8B-LAiM-bnb-4bit"),
            ("qwen/qwen3-8b-fp8", "LAiM/Qwen3-8B-LAiM-bnb-4bit"),
            (
                "mistralai/ministral-3-3b-instruct-2512",
                "LAiM/Ministral-3-3B-Instruct-2512-LAiM-bnb-4bit",
            ),
            (
                "allenai/olmo-3-7b-instruct",
                "LAiM/Olmo-3-7B-Instruct-LAiM-bnb-4bit",
            ),
            ("LAiM/kimi-k2-instruct", "LAiM/Kimi-K2-Instruct-BF16"),
        ]
        for src, expected in contracts:
            with self.subTest(src = src):
                self.assertEqual(FLOAT_TO_INT_MAPPER[src], expected)
        self.assertEqual(MAP_TO_LAiM_16bit["qwen/qwen3-8b-fp8"], "LAiM/Qwen3-8B-FP8")
        self.assertEqual(
            MAP_TO_LAiM_16bit["agentica-org/deepscaler-1.5b-preview"],
            "LAiM/DeepScaleR-1.5B-Preview",
        )


if __name__ == "__main__":
    unittest.main()
