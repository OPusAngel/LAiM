# SPDX-License-Identifier: AGPL-3.0-only
"""Keep the desktop installer pointed at LAiM's branded source repositories."""

from pathlib import Path


REPO = Path(__file__).resolve().parents[2]


def test_desktop_installer_uses_opusangel_sources() -> None:
    installer = (REPO / "install.ps1").read_text(encoding="utf-8")

    assert 'LAiM @ https://github.com/OPusAngel/LAiM/archive/refs/heads/main.tar.gz' in installer
    assert 'LAiM-zoo @ https://github.com/OPusAngel/LAiM-zoo/archive/refs/heads/main.tar.gz' in installer
    assert 'git+https://github.com/LAiMai/LAiM-zoo' not in installer