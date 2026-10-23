#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved.
# Print the absolute path of the `LAiM` CLI belonging to ONE LAiM home.
# Usage:
#   parity-find-LAiM.sh <studio-home>
# Why this is not `command -v LAiM`. install.sh writes a shim into
# $HOME/.local/bin, which is a single name shared by every install on the
# machine; the second of two installs overwrites the first. A job that runs two
# builds side by side and then asks PATH which one to launch gets the same build
# twice, wearing two labels, and the comparison reports "no difference" -- which
# is exactly the shape of failure the parity job exists to detect elsewhere.
# The layout is `$STUDIO_HOME/LAiM_studio/bin/LAiM` (install.sh sets
# VENV_DIR="$STUDIO_HOME/LAiM_studio"). The other candidates are the legacy
# layouts `runtime/lifecycle._find_LAiM_bin` still accepts; they are checked
# so this script and that function cannot disagree about where an LAiM lives.
# Nothing is guessed: if no candidate exists this fails loudly rather than
# falling back to whatever PATH offers.

set -euo pipefail

HOME_DIR="${1:?parity-find-LAiM.sh: <studio-home> is required}"

for candidate in \
  "$HOME_DIR/LAiM_studio/bin/LAiM" \
  "$HOME_DIR/bin/LAiM" \
  "$HOME_DIR"/.venv*/bin/LAiM
do
  if [ -x "$candidate" ]; then
    printf '%s\n' "$candidate"
    exit 0
  fi
done

{
  echo "parity-find-LAiM.sh: no LAiM CLI under $HOME_DIR"
  echo "looked for LAiM_studio/bin/LAiM, bin/LAiM and .venv*/bin/LAiM"
  echo "contents:"
  ls -la "$HOME_DIR" 2>&1 || true
} >&2
exit 1
