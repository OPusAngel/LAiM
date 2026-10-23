#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright 2026-present the LAiM AI Inc. team. All rights reserved.
# Boot `LAiM run --disable-tools` in the background, wait for it to be
# healthy, parse the minted API key from the banner, and resolve the
# /v1/models id. Exports everything downstream steps need into $GITHUB_ENV
# (or prints it when run outside Actions). Factored out of the workflow so
# the failure-isolation logic lives in one shellcheck-clean place.
# Usage:
#   serve-LAiM-run.sh --model REPO --gguf-variant VAR --port PORT \
#       [--gguf-file PATH] [--extra "--seed 3407 --temp 0"] \
#       [--log-dir logs] [--health-timeout 300] [--banner-timeout 300]
# Why a helper and not inline YAML
#  * Every `LAiM run` invocation here is the *LAiM server* under test.
#    A failure to come up healthy is class (a) "server/API regression" and
#    must be reported with a distinct `::error::` BEFORE any agent runs.
#  * The banner is the documented contract a human copies from. We parse the
#    exact `API Key:` line printed by LAiM_cli/commands/studio.py
#    (`  API Key:      <key>` non-silent, `API Key: <key>` silent) so a
#    silent change to that line is also caught.
#  * `LAiM run` re-execs into the studio venv ($STUDIO_HOME/LAiM_studio),
#    so in CI after `install.sh --local` it runs the PR's repo code.
# Outputs written to $GITHUB_ENV (and echoed):
#   LAiM_API_KEY        the sk-LAiM-* key minted on the banner
#   LAiM_STUDIO_URL     http://127.0.0.1:<PORT>  (so `LAiM start`
#                          finds THIS server, not the hardcoded :8888)
#   LAiM_BASE_URL       same as LAiM_STUDIO_URL (alias for clarity)
#   LAiM_MODEL_ID       the canonical id reported by /v1/models
#   LAiM_SERVER_PID     pid of the backgrounded `LAiM run`
#   LAiM_LLAMA_LOG_DIR  ~/.LAiM/studio/logs/llama-server

set -uo pipefail

# ── arg parse ────────────────────────────────────────────────────────────
MODEL=""
GGUF_VARIANT=""
GGUF_FILE=""
PORT=""
EXTRA=""
LOG_DIR="logs"
HEALTH_TIMEOUT="300"
BANNER_TIMEOUT="300"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --model)          MODEL="$2"; shift 2 ;;
    --gguf-variant)   GGUF_VARIANT="$2"; shift 2 ;;
    --gguf-file)      GGUF_FILE="$2"; shift 2 ;;
    --port)           PORT="$2"; shift 2 ;;
    --extra)          EXTRA="$2"; shift 2 ;;
    --log-dir)        LOG_DIR="$2"; shift 2 ;;
    --health-timeout) HEALTH_TIMEOUT="$2"; shift 2 ;;
    --banner-timeout) BANNER_TIMEOUT="$2"; shift 2 ;;
    *) echo "serve-LAiM-run.sh: unknown arg '$1'" >&2; exit 2 ;;
  esac
done

[ -n "$PORT" ] || { echo "serve-LAiM-run.sh: --port is required" >&2; exit 2; }
if [ -z "$MODEL" ] && [ -z "$GGUF_FILE" ]; then
  echo "serve-LAiM-run.sh: one of --model or --gguf-file is required" >&2
  exit 2
fi

mkdir -p "$LOG_DIR"
SERVER_LOG="$LOG_DIR/LAiM-run-${PORT}.log"
BASE_URL="http://127.0.0.1:${PORT}"
STUDIO_HOME_DIR="${STUDIO_HOME:-$HOME/.LAiM/studio}"
LLAMA_LOG_DIR="${STUDIO_HOME_DIR}/logs/llama-server"

# Emit a key=value pair to $GITHUB_ENV when set, always echo for local runs.
emit() {
  echo "$1=$2"
  if [ -n "${GITHUB_ENV:-}" ]; then
    echo "$1=$2" >> "$GITHUB_ENV"
  fi
}

server_fail() {
  echo "::error::LAiM server/API regression: $*" >&2
  echo "---- last 200 lines of $SERVER_LOG ----" >&2
  tail -200 "$SERVER_LOG" 2>/dev/null || true
  exit 1
}

# ── port collision guard ─────────────────────────────────────────────────
# A leftover listener (or a parallel matrix cell that wandered onto our port)
# would make us attach to the wrong server and mask a real regression. Fail
# fast instead.
if command -v ss >/dev/null 2>&1; then
  if ss -tln 2>/dev/null | grep -q ":${PORT}\b"; then
    server_fail "port ${PORT} already has a listener before we started (collision)"
  fi
fi

# ── build the command ────────────────────────────────────────────────────
# `LAiM run` == alias of `LAiM studio run`. --disable-tools is REQUIRED
# (passthrough mode) so the agent's own tools relay instead of the server's.
# --no-cloudflare keeps us off the network (loopback bind, no tunnel attempt).
CMD=(LAiM run -H 127.0.0.1 -p "$PORT" --disable-tools --no-cloudflare)
if [ -n "$GGUF_FILE" ]; then
  CMD+=(--model "$GGUF_FILE")
else
  CMD+=(--model "$MODEL")
  [ -n "$GGUF_VARIANT" ] && CMD+=(--gguf-variant "$GGUF_VARIANT")
fi
# Determinism knobs + any caller passthrough (e.g. --seed 3407 --temp 0).
# shellcheck disable=SC2206  # intentional word-split of caller-controlled flags
[ -n "$EXTRA" ] && CMD+=($EXTRA)

echo "[serve] launching: ${CMD[*]}"
echo "[serve] server log: $SERVER_LOG"

# Run detached, no controlling TTY (setsid avoids any TTY-prompt hang and
# detaches from this step's process group so the job's teardown is clean).
setsid "${CMD[@]}" > "$SERVER_LOG" 2>&1 < /dev/null &
SERVER_PID=$!
emit LAiM_SERVER_PID "$SERVER_PID"

# ── wait for /api/health == healthy ──────────────────────────────────────
HEALTHY=0
for _ in $(seq 1 "$HEALTH_TIMEOUT"); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    server_fail "process exited before becoming healthy (pid $SERVER_PID)"
  fi
  if curl -fs "${BASE_URL}/api/health" -o "$LOG_DIR/health-${PORT}.json" 2>/dev/null; then
    if jq -e '.status == "healthy"' "$LOG_DIR/health-${PORT}.json" >/dev/null 2>&1; then
      HEALTHY=1
      break
    fi
  fi
  sleep 1
done
[ "$HEALTHY" = "1" ] || server_fail "did not report /api/health healthy within ${HEALTH_TIMEOUT}s"
echo "[serve] /api/health healthy"

# ── parse the API key from the banner ────────────────────────────────────
# Match both the non-silent "  API Key:      <key>" and silent "API Key: <key>"
# forms. We do NOT trust a fixed column count; we take the sk-LAiM-* token.
# The banner is printed once the model has LOADED, which /api/health does not
# wait for. That usually takes about 10s, but a 4.8 GB GGUF on a busy CPU
# runner has taken over 30s, so wait on the load itself: until the key is
# printed, the server exits, or --banner-timeout runs out.
API_KEY=""
for _ in $(seq 1 "$BANNER_TIMEOUT"); do
  API_KEY="$(grep -aoE 'sk-LAiM-[A-Za-z0-9_-]+' "$SERVER_LOG" 2>/dev/null | head -1 || true)"
  [ -n "$API_KEY" ] && break
  # The label is out but carries no sk-LAiM- token: the fallback below reads it.
  grep -aq 'API Key:' "$SERVER_LOG" 2>/dev/null && break
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    server_fail "process exited before printing its banner (the model load failed)"
  fi
  sleep 1
done
if [ -z "$API_KEY" ] && ! grep -aq 'API Key:' "$SERVER_LOG" 2>/dev/null; then
  server_fail "no banner within ${BANNER_TIMEOUT}s of /api/health: the model is still loading"
fi
if [ -z "$API_KEY" ]; then
  # Fallback: take whatever follows an "API Key:" label, in case the key
  # prefix scheme changes. Still a parse-fragility guard, not silent.
  API_KEY="$(grep -aE 'API Key:' "$SERVER_LOG" 2>/dev/null \
    | sed -E 's/.*API Key:[[:space:]]*//' | head -1 || true)"
fi
[ -n "$API_KEY" ] || server_fail "could not parse an API key from the banner (banner-parse fragility -- check the 'API Key:' line in LAiM_cli/commands/studio.py)"
echo "::add-mask::${API_KEY}"
emit LAiM_API_KEY "$API_KEY"

# ── resolve /v1/models id ────────────────────────────────────────────────
if ! curl -fs "${BASE_URL}/v1/models" \
    -H "Authorization: Bearer ${API_KEY}" -o "$LOG_DIR/models-${PORT}.json" 2>/dev/null; then
  server_fail "/v1/models did not respond (or rejected the banner key)"
fi
MODEL_ID="$(jq -r '.data[0].id // empty' "$LOG_DIR/models-${PORT}.json" 2>/dev/null || true)"
[ -n "$MODEL_ID" ] || server_fail "/v1/models returned no model id (model failed to load)"
echo "[serve] resolved model id: $MODEL_ID"

emit LAiM_MODEL_ID "$MODEL_ID"
emit LAiM_STUDIO_URL "$BASE_URL"
emit LAiM_BASE_URL "$BASE_URL"
emit LAiM_LLAMA_LOG_DIR "$LLAMA_LOG_DIR"

echo "[serve] server is up: ${BASE_URL} (model ${MODEL_ID})"
