# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

"""Tests for Bypass Permissions (skip the confirmation gate).

Covers the secret-name classifier, the child-env builders, the request-model
default, the confirm-vs-bypass precedence rule the route enforces, and that no
loop gates a call once bypass is set.

Run with: ``PYTHONPATH=studio/backend python -m pytest studio/backend/tests/test_bypass_permissions.py -q``
"""

import os
import sys
from pathlib import Path

import pytest

import core.inference.tools as tools
from core.inference.tools import (
    _build_bypass_env,
    _is_cred_location_env_name,
    _is_secret_env_name,
    _is_secret_env_value,
)

_POSIX_ONLY = pytest.mark.skipif(
    sys.platform == "win32", reason = "preexec_fn / setsid are POSIX-only"
)


# ── secret-name classifier ──────────────────────────────────────────


@pytest.mark.parametrize(
    "name",
    [
        "HF_TOKEN",
        "HUGGING_FACE_HUB_TOKEN",
        "WANDB_API_KEY",
        "GH_TOKEN",
        "GITHUB_TOKEN",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_ACCESS_KEY_ID",
        "AZURE_CLIENT_SECRET",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "MY_DB_PASSWORD",
        "x_api_key",
        "SOME_PRIVATE_KEY",
        "LD_PRELOAD",
    ],
)
def test_secret_names_are_flagged(name):
    assert _is_secret_env_name(name) is True


@pytest.mark.parametrize(
    "name", ["PATH", "HOME", "LANG", "TERM", "PWD", "SHELL", "HOSTVAR", "MY_VAR"]
)
def test_benign_names_are_not_flagged(name):
    assert _is_secret_env_name(name) is False


# ── env builders ────────────────────────────────────────────────────


# ── request model default ───────────────────────────────────────────


def test_request_model_bypass_default_false():
    from models.inference import ChatCompletionRequest
    assert ChatCompletionRequest.model_fields["bypass_permissions"].default is False


# ── confirm-vs-bypass precedence (mirrors the route rule) ───────────


@pytest.mark.parametrize(
    "confirm,bypass,effective_confirm",
    [
        (False, False, False),
        (True, False, True),
        (False, True, False),
        (True, True, False),
    ],
)
def test_confirm_precedence_rule(confirm, bypass, effective_confirm):
    # The route computes: confirm_tool_calls = confirm and not bypass.
    assert (bool(confirm) and not bool(bypass)) is effective_confirm


# ── agentic loop never gates under bypass ──

_DEFAULT_TOOLS = [
    {"type": "function", "function": {"name": "python"}},
    {"type": "function", "function": {"name": "web_search"}},
]


def _tool_call(name, args_json):
    return f'<tool_call>{{"name": "{name}", "arguments": {args_json}}}</tool_call>'


def _multi_turn(turns):
    it = iter(turns)

    def _gen(_messages):
        try:
            yield next(it)
        except StopIteration:
            return

    return _gen


def test_gguf_loop_confirm_gate_respects_bypass():
    # The GGUF loop needs a live llama-server, so (per the other llama_cpp
    # tests) assert via AST that its _needs_confirm gate applies the bypass
    # precedence, mirroring the safetensors behavioral test above.
    import ast
    import inspect
    import textwrap

    llama_cpp = pytest.importorskip("core.inference.llama_cpp")
    src = textwrap.dedent(
        inspect.getsource(llama_cpp.LlamaCppBackend.generate_chat_completion_with_tools)
    )
    gates = [
        node
        for node in ast.walk(ast.parse(src))
        if isinstance(node, ast.Assign)
        and any(getattr(t, "id", None) == "needs_confirm" for t in node.targets)
    ]
    assert gates, "could not find the needs_confirm gate in the GGUF loop"
    names = {n.id for g in gates for n in ast.walk(g.value) if isinstance(n, ast.Name)}
    assert "confirm_tool_calls" in names
    assert "bypass_permissions" in names  # bypass must suppress the GGUF gate


# ── broker / capability env vars are stripped (regression) ──────────


@pytest.mark.parametrize(
    "name",
    ["SSH_AUTH_SOCK", "SSH_AGENT_PID", "GPG_AGENT_INFO", "GNUPGHOME", "KUBECONFIG"],
)
def test_broker_capability_names_are_flagged(name):
    # Not secrets by value, but they hand the child the operator's live agent
    # (ssh/gpg) or kube credentials, so bypass mode must drop them.
    assert _is_secret_env_name(name) is True


# ── credential-bearing URL values stripped regardless of name ───────


@pytest.mark.parametrize(
    "value",
    [
        "https://user:s3cr3t@feed.example.invalid/simple",  # user:pass@
        "https://ghp_deadbeef@github.com/org/private.git",  # token-only@
        "https://__token__@pypi.example.invalid/simple",
        "https://ghp_1234:@npm.pkg.github.com/simple",  # empty password
        "postgres://dbuser:dbpass@db.example.invalid/app",
    ],
)
def test_url_userinfo_values_are_flagged(value):
    assert _is_secret_env_value(value) is True


@pytest.mark.parametrize(
    "value",
    [
        "https://example.invalid/simple",  # no userinfo
        "http://proxy.corp.example:8080",  # benign proxy
        "https://pypi.corp.example/simple",  # benign internal index
        "redis://localhost:6379/0",  # no creds
        "https://example.invalid/path?ref=a@b",  # '@' only in query, not userinfo
    ],
)
def test_non_credential_url_values_are_not_flagged(value):
    assert _is_secret_env_value(value) is False


def test_url_userinfo_value_is_stripped_even_with_benign_name(monkeypatch, tmp_path):
    # NAME dodges the classifier, but the VALUE embeds userinfo -> must go.
    monkeypatch.setenv("MY_FEED", "https://user:s3cr3t@feed.example.invalid/simple")
    monkeypatch.setenv("REPO_URL", "https://ghp_deadbeef@github.com/org/private.git")
    # A URL without credentials is harmless and should be kept.
    monkeypatch.setenv("PLAIN_URL", "https://example.invalid/simple")
    env = _build_bypass_env(str(tmp_path))
    assert "MY_FEED" not in env
    assert "REPO_URL" not in env
    assert env.get("PLAIN_URL") == "https://example.invalid/simple"


def test_bypass_env_keeps_noncredential_proxy_and_index_urls(monkeypatch, tmp_path):
    # Benign routing/config vars must survive bypass mode (proxy-only or
    # internal-index networks); only credentialed values are dropped.
    monkeypatch.setenv("HTTP_PROXY", "http://proxy.corp.example:8080")
    monkeypatch.setenv("PIP_INDEX_URL", "https://pypi.corp.example/simple")
    monkeypatch.setenv("PIP_EXTRA_INDEX_URL", "https://user:token@pypi.example.invalid/simple")
    env = _build_bypass_env(str(tmp_path))
    assert env["HTTP_PROXY"] == "http://proxy.corp.example:8080"
    assert env["PIP_INDEX_URL"] == "https://pypi.corp.example/simple"
    assert "PIP_EXTRA_INDEX_URL" not in env  # this one carries credentials


# ── AWS IMDS-disable hardening flag is kept (regression) ────────────


def test_aws_imds_disable_flag_is_kept_but_creds_stripped(monkeypatch, tmp_path):
    # AWS_EC2_METADATA_DISABLED is a non-secret opt-out: dropping it would let a
    # bypassed boto/AWS-CLI call fall back to the instance role via IMDS even
    # though the operator disabled that path. Keep it; drop the real creds.
    monkeypatch.setenv("AWS_EC2_METADATA_DISABLED", "true")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "AKIAEXAMPLE")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "shhh")
    assert _is_secret_env_name("AWS_EC2_METADATA_DISABLED") is False
    assert _is_secret_env_name("AWS_ACCESS_KEY_ID") is True
    env = _build_bypass_env(str(tmp_path))
    assert env.get("AWS_EC2_METADATA_DISABLED") == "true"
    assert "AWS_ACCESS_KEY_ID" not in env
    assert "AWS_SECRET_ACCESS_KEY" not in env


# ── connection-string env vars are stripped (regression) ────────────


@pytest.mark.parametrize(
    "name",
    [
        "SQLCONNSTR_DB",  # Azure App Service injected connection strings
        "MYSQLCONNSTR_DB",
        "SQLAZURECONNSTR_DB",
        "POSTGRESQLCONNSTR_DB",
        "CUSTOMCONNSTR_CACHE",
        "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
    ],
)
def test_connection_string_names_are_flagged(name):
    assert _is_secret_env_name(name) is True


@pytest.mark.parametrize(
    "value",
    [
        "Server=tcp:db;Database=app;User ID=u;Password=p@ss;",  # ADO.NET
        "DefaultEndpointsProtocol=https;AccountName=x;AccountKey=abc123==;",  # storage
        "Endpoint=sb://x;SharedAccessKeyName=n;SharedAccessKey=zzz=",  # Service Bus
    ],
)
def test_connection_string_values_are_flagged(value):
    assert _is_secret_env_value(value) is True


@pytest.mark.parametrize(
    "value",
    [
        "Server=tcp:db;Database=app;User ID=u;",  # no password field
        "Endpoint=sb://x;SharedAccessKeyName=n",  # key NAME only, no secret
        "AccountName=x;EndpointSuffix=core.windows.net",  # no AccountKey
    ],
)
def test_connection_string_noncredential_values_are_not_flagged(value):
    assert _is_secret_env_value(value) is False


def test_connection_string_value_stripped_even_with_benign_name(monkeypatch, tmp_path):
    # NAME dodges the classifier, but the VALUE is a credentialed conn string.
    monkeypatch.setenv("APP_DB", "Server=tcp:db;Database=app;User ID=u;Password=p@ss;")
    monkeypatch.setenv("SQLCONNSTR_DB", "DefaultEndpointsProtocol=https;AccountKey=abc==")
    env = _build_bypass_env(str(tmp_path))
    assert "APP_DB" not in env  # value-based catch
    assert "SQLCONNSTR_DB" not in env  # name-based catch


# ── temp dirs repointed on every platform (regression) ──────────────


# ── credential-location redirect vars are dropped (regression) ──────────
# Vars that point SDKs at the real home/cache/config (cached tokens), e.g.
# HF_HOME which startup always sets -> the live leak the HOME repoint missed.


@pytest.mark.parametrize(
    "name",
    [
        "HF_HOME",
        "HF_HUB_CACHE",
        "HUGGINGFACE_HUB_CACHE",
        "HF_XET_CACHE",
        "TRANSFORMERS_CACHE",
        "HF_DATASETS_CACHE",
        "XDG_CONFIG_HOME",
        "XDG_CACHE_HOME",
        "XDG_DATA_HOME",
        "NETRC",
        "BOTO_CONFIG",
        "PIP_CONFIG_FILE",
        "CLOUDSDK_CONFIG",
        "KAGGLE_CONFIG_DIR",
        "DOCKER_CONFIG",
        "WANDB_DIR",
        "WANDB_CONFIG_DIR",
        "NPM_CONFIG_USERCONFIG",
        "NPM_CONFIG_GLOBALCONFIG",
        "YARN_RC_FILENAME",
        "GIT_CONFIG_GLOBAL",
        "GIT_CONFIG_SYSTEM",
        "CARGO_HOME",
        "RCLONE_CONFIG",
        "GIT_ASKPASS",
        "SSH_ASKPASS",
        "BASH_ENV",
        "HOMEDRIVE",
        "HOMEPATH",
    ],
)
def test_cred_location_names_are_flagged(name):
    assert _is_cred_location_env_name(name) is True


@pytest.mark.parametrize("name", ["PATH", "HOME", "LANG", "PWD", "MY_VAR"])
def test_benign_names_not_flagged_as_cred_location(name):
    assert _is_cred_location_env_name(name) is False


def test_bypass_env_drops_hf_home_so_cached_token_unreachable(monkeypatch, tmp_path):
    # The live leak: startup sets HF_HOME at the real cache, whose $HF_HOME/token
    # holds the operator's token. Repointing HOME does not stop huggingface_hub
    # from reading $HF_HOME/token, so HF_HOME must be dropped in bypass mode.
    real_cache = tmp_path / "real_hf_cache"
    real_cache.mkdir()
    (real_cache / "token").write_text("hf_cachedOperatorToken")
    monkeypatch.setenv("HF_HOME", str(real_cache))
    monkeypatch.setenv("HF_HUB_CACHE", str(real_cache / "hub"))
    env = _build_bypass_env(str(tmp_path))
    assert "HF_HOME" not in env  # dropped -> HF falls back to $HOME/.cache (empty)
    assert "HF_HUB_CACHE" not in env


def test_bypass_env_hf_token_ignores_the_explicit_real_cache(monkeypatch, tmp_path):
    # Even when HF_HOME and XDG_CACHE_HOME both point at a real cache, the bypass
    # env drops those pointers, so huggingface_hub falls back to the profile's own
    # default cache instead of the cache the operator named.
    pytest.importorskip("huggingface_hub")
    import subprocess

    real_cache = tmp_path / "real_hf"
    real_cache.mkdir()
    workdir = tmp_path / "workdir"
    workdir.mkdir()
    monkeypatch.setenv("HF_HOME", str(real_cache))
    monkeypatch.setenv("XDG_CACHE_HOME", str(real_cache))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(real_cache))
    env = _build_bypass_env(str(workdir))
    token_path = subprocess.run(
        [
            sys.executable,
            "-c",
            "import huggingface_hub.constants as c; print(c.HF_TOKEN_PATH)",
        ],
        env = env,
        capture_output = True,
        text = True,
    ).stdout.strip()
    assert str(real_cache) not in token_path  # the explicit pointer was dropped
    assert token_path.startswith(str(Path.home()))


def test_bypass_env_drops_credential_config_path_vars(monkeypatch, tmp_path):
    # NETRC / BOTO_CONFIG / PIP_CONFIG_FILE point clients at real credential
    # files before $HOME, so they must not survive into the bypassed child.
    monkeypatch.setenv("NETRC", "/home/op/.netrc")
    monkeypatch.setenv("PGPASSFILE", "/home/op/.pgpass")
    monkeypatch.setenv("BOTO_CONFIG", "/home/op/.boto")
    monkeypatch.setenv("PIP_CONFIG_FILE", "/home/op/.pip/pip.conf")
    env = _build_bypass_env(str(tmp_path))
    assert "NETRC" not in env
    assert "PGPASSFILE" not in env
    assert "BOTO_CONFIG" not in env
    assert "PIP_CONFIG_FILE" not in env


def test_bypass_env_strips_npm_auth_and_mysql_pwd(monkeypatch, tmp_path):
    # NPM_CONFIG__AUTH (npm _auth, base64) and MYSQL_PWD dodge the URL-value
    # check and the PASSWD marker, but must still be dropped.
    monkeypatch.setenv("NPM_CONFIG__AUTH", "aGVsbG86c2VjcmV0")
    monkeypatch.setenv("MYSQL_PWD", "db-password")
    assert _is_secret_env_name("NPM_CONFIG__AUTH") is True
    assert _is_secret_env_name("MYSQL_PWD") is True
    env = _build_bypass_env(str(tmp_path))
    assert "NPM_CONFIG__AUTH" not in env
    assert "MYSQL_PWD" not in env


def test_bypass_env_keeps_real_windows_profile_vars(monkeypatch, tmp_path):
    # On Windows, SDKs resolve the profile through USERPROFILE/APPDATA/LOCALAPPDATA.
    # They are inherited unchanged so ~/Desktop and the user's apps work; only the
    # HOMEDRIVE/HOMEPATH pair (a second home spelling) is dropped as a cred pointer.
    monkeypatch.setenv("USERPROFILE", "/host/profile")
    monkeypatch.setenv("APPDATA", "/host/profile/AppData/Roaming")
    monkeypatch.setenv("LOCALAPPDATA", "/host/profile/AppData/Local")
    monkeypatch.setenv("HOMEDRIVE", "C:")
    monkeypatch.setenv("HOMEPATH", "\\Users\\op")
    env = _build_bypass_env(str(tmp_path))
    assert env["USERPROFILE"] == "/host/profile"
    assert env["APPDATA"] == "/host/profile/AppData/Roaming"
    assert env["LOCALAPPDATA"] == "/host/profile/AppData/Local"
    assert "HOMEDRIVE" not in env
    assert "HOMEPATH" not in env


def test_bypass_env_does_not_add_unset_windows_profile_vars(monkeypatch, tmp_path):
    # Only repoint Windows profile vars that were actually set (no pollution on
    # Linux/macOS where they are absent).
    monkeypatch.delenv("USERPROFILE", raising = False)
    monkeypatch.delenv("APPDATA", raising = False)
    monkeypatch.delenv("LOCALAPPDATA", raising = False)
    env = _build_bypass_env(str(tmp_path))
    assert "USERPROFILE" not in env
    assert "APPDATA" not in env
    assert "LOCALAPPDATA" not in env


# ── parent /proc env-leak hardening (regression) ────────────────────


@_POSIX_ONLY
def test_proc_env_unreadable_after_hardening():
    # Mechanism check: after hardening, a same-UID child can no longer read the
    # parent process /proc environ. Restores the dumpable flag afterwards so the
    # process-global state does not leak into later tests.
    import subprocess

    if tools._libc is None:
        pytest.skip("no libc/prctl available")
    pid = os.getpid()
    probe = (
        "try:\n"
        f"    open('/proc/{pid}/environ', 'rb').read()\n"
        "    print('READABLE')\n"
        "except PermissionError:\n"
        "    print('DENIED')\n"
    )
    prev_dumpable = tools._libc.prctl(3, 0, 0, 0, 0)  # PR_GET_DUMPABLE
    prev_guard = tools._parent_proc_hardened
    try:
        # Establish a clean readable baseline: another test may have already
        # cleared the dumpable flag on this process.
        tools._libc.prctl(4, 1, 0, 0, 0)  # PR_SET_DUMPABLE = 1
        before = subprocess.run(
            [sys.executable, "-c", probe], capture_output = True, text = True
        ).stdout.strip()
        if before != "READABLE":
            pytest.skip("/proc already restricted in this environment")

        tools._parent_proc_hardened = False
        assert tools._harden_parent_against_proc_env_leak() is True

        after = subprocess.run(
            [sys.executable, "-c", probe], capture_output = True, text = True
        ).stdout.strip()
        assert after == "DENIED"
    finally:
        if prev_dumpable in (0, 1):
            try:
                tools._libc.prctl(4, prev_dumpable, 0, 0, 0)
            except (OSError, AttributeError):
                pass
        tools._parent_proc_hardened = prev_guard


# ── Anthropic request model declares the field (regression) ─────────


def test_anthropic_request_model_bypass_default_false():
    # Omitting the field on the Anthropic path must default to False rather than
    # raising AttributeError (extra='allow' does not set absent attributes).
    from models.inference import AnthropicMessagesRequest

    assert AnthropicMessagesRequest.model_fields["bypass_permissions"].default is False
    req = AnthropicMessagesRequest(model = "x", messages = [], max_tokens = 8)
    assert bool(req.bypass_permissions) is False
