#!/usr/bin/env bash
# Default CMD of the ROCm Studio image (Dockerfile.studio-rocm): Studio alone, no
# supervisord. LAiM_STUDIO_PASSWORD only sets the initial admin password, and
# `LAiM studio` exits 1 when handed one after that, so a `docker restart` with
# the variable still set (a Compose file) would never come back up. As
# studio_launch.sh does: the value goes to a root-only file that LAiM-studio-run
# reads while nothing is stored, and never into Studio's environment.
set -euo pipefail

LAiM-studio-home

INITIAL_FILE="${LAiM_STUDIO_INITIAL_PASSWORD_FILE:-/run/LAiM/studio-initial-password}"
rm -f "$INITIAL_FILE"
if LAiM-studio-run --stored; then
    NOTE="password set on an earlier boot (inside the container: LAiM studio reset-password)"
elif [[ -n "${LAiM_STUDIO_PASSWORD:-}" ]]; then
    mkdir -p "$(dirname "$INITIAL_FILE")"
    (umask 077 && printf '%s' "$LAiM_STUDIO_PASSWORD" > "$INITIAL_FILE")
    NOTE="password from LAiM_STUDIO_PASSWORD env"
else
    NOTE="password generated on first boot; LAiM Studio names the file it wrote in its log below"
fi
unset LAiM_STUDIO_PASSWORD
echo "LAiM Studio -> http://localhost:${LAiM_STUDIO_PORT:-8000}   (user LAiM, ${NOTE})"
exec LAiM-studio-run
