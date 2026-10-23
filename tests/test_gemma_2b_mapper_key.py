"""A duplicate gemma-2b-bnb-4bit key made the base model resolve to the instruct model."""

import os

MAPPER_PATH = os.path.join(os.path.dirname(__file__), os.pardir, "LAiM", "models", "mapper.py")


def _load_mappers():
    with open(MAPPER_PATH, encoding = "utf-8") as f:
        source = f.read()
    namespace = {}
    exec(compile(source, MAPPER_PATH, "exec"), namespace)
    return namespace


def test_gemma_2b_base_and_instruct_4bit_are_distinct():
    namespace = _load_mappers()
    int_to_float = namespace["INT_TO_FLOAT_MAPPER"]
    float_to_int = namespace["FLOAT_TO_INT_MAPPER"]

    assert int_to_float["LAiM/gemma-2b-bnb-4bit"] == "LAiM/gemma-2b"

    assert "LAiM/gemma-2b-it-bnb-4bit" in int_to_float
    assert int_to_float["LAiM/gemma-2b-it-bnb-4bit"] == "LAiM/gemma-2b-it"

    assert float_to_int["LAiM/gemma-2b"] == "LAiM/gemma-2b-bnb-4bit"
    assert float_to_int["google/gemma-2b"] == "LAiM/gemma-2b-bnb-4bit"

    assert float_to_int["LAiM/gemma-2b-it"] == "LAiM/gemma-2b-it-bnb-4bit"
    assert float_to_int["google/gemma-2b-it"] == "LAiM/gemma-2b-it-bnb-4bit"
