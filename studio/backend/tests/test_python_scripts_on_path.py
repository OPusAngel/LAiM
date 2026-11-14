"""The child shell must see a Python install's console scripts, and a "not found" must name
the real path instead of reading as "not installed"."""

import os
import sys

import pytest

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from core.inference import tool_call_parser as tcp
from core.inference import tools

pytestmark = pytest.mark.skipif(os.name != "nt", reason = "Windows Scripts layout")


def _fake_install(tmp_path, monkeypatch, module: str = "FakeMod"):
    """A launcher-style install: Scripts holds the entry point, site-packages holds the module."""
    root = tmp_path / "Python" / "pythoncore-3.15-64"
    scripts = root / "Scripts"
    scripts.mkdir(parents = True)
    (scripts / "zzfaketool.exe").write_bytes(b"MZ")
    site = root / "Lib" / "site-packages"
    site.mkdir(parents = True)
    (site / module).mkdir()
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setenv("APPDATA", str(tmp_path / "none"))
    monkeypatch.setenv("ProgramFiles", str(tmp_path / "none"))
    return scripts


def test_scripts_dir_goes_on_the_child_path(tmp_path, monkeypatch):
    scripts = _fake_install(tmp_path, monkeypatch)
    env = tools._build_bypass_env(str(tmp_path))
    assert str(scripts) in env["PATH"].split(os.pathsep)


def test_command_not_found_names_the_installed_path(tmp_path, monkeypatch):
    scripts = _fake_install(tmp_path, monkeypatch)
    result = "Exit code 127:\n/usr/bin/bash: line 1: zzfaketool: command not found\n"
    hint = tools._missing_tool_hint(result)
    assert str(scripts / "zzfaketool.exe") in hint
    # The one sentence that stops the model handing the job back to the user.
    assert "Do not ask the user to install it" in hint


def test_module_name_case_is_corrected(tmp_path, monkeypatch):
    _fake_install(tmp_path, monkeypatch, module = "FakeMod")
    result = (
        "Exit code 1:\nC:\\Python\\python.exe: No module named fakemod\n"
    )
    hint = tools._missing_tool_hint(result)
    assert "-m FakeMod" in hint
    assert "case-sensitive" in hint


def test_a_genuinely_missing_tool_gets_no_hint(tmp_path, monkeypatch):
    _fake_install(tmp_path, monkeypatch)
    assert tools._missing_tool_hint("bash: line 1: nosuchtoolhere: command not found") == ""
    assert tools._missing_tool_hint("No module named nosuchmodulehere") == ""


def test_the_first_repeat_note_is_advice_and_the_second_forbids():
    first = tcp.repeated_result_message("terminal", 3, "boom", 1)
    second = tcp.repeated_result_message("terminal", 3, "boom", 2)
    assert "it will not change" in first and "it will not change" in second
    assert "Do NOT run this command again" not in first
    assert "Do NOT run this command again" in second
