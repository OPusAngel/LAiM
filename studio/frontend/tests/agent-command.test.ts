// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentCommand,
  buildAgentShellCommands,
  quoteShellArg,
} from "../src/features/settings/components/agent-command.ts";

const REMOTE_STUDIO = "https://shed-topic-remark-arguments.trycloudflare.com/";

test("the Windows variant reproduces the reported PowerShell command", () => {
  assert.equal(
    buildAgentCommand(REMOTE_STUDIO, null, "windows", "claude"),
    '$env:LAiM_STUDIO_URL="https://shed-topic-remark-arguments.trycloudflare.com"; LAiM start claude',
  );
});

test("the Unix override emits a Bash-compatible remote command", () => {
  assert.equal(
    buildAgentCommand(REMOTE_STUDIO, null, "unix", "claude"),
    "LAiM_STUDIO_URL=https://shed-topic-remark-arguments.trycloudflare.com LAiM start claude",
  );
});

test("safe model IDs do not get unnecessary quotes", () => {
  assert.equal(
    quoteShellArg("LAiM/Qwen3.8:UD-Q4_K_XL", "unix"),
    "LAiM/Qwen3.8:UD-Q4_K_XL",
  );
  assert.equal(
    quoteShellArg("LAiM/Qwen3.8:UD-Q4_K_XL", "windows"),
    "LAiM/Qwen3.8:UD-Q4_K_XL",
  );
});

test("model paths use the selected shell's single-quote escaping", () => {
  assert.equal(
    quoteShellArg("/tmp/Lee's model.gguf", "unix"),
    "'/tmp/Lee'\\''s model.gguf'",
  );
  assert.equal(
    quoteShellArg("C:\\Models\\Lee's model.gguf", "windows"),
    "'C:\\Models\\Lee''s model.gguf'",
  );
});

test("the Unix selection reaches every generated command", () => {
  const commands = buildAgentShellCommands(
    REMOTE_STUDIO,
    "unix",
    "codex",
    "--model '/tmp/My model.gguf'",
  );
  assert.equal(
    commands.primary,
    "LAiM_STUDIO_URL=https://shed-topic-remark-arguments.trycloudflare.com LAiM start codex --model '/tmp/My model.gguf'",
  );
  assert.equal(
    commands.subagent,
    "LAiM_STUDIO_URL=https://shed-topic-remark-arguments.trycloudflare.com LAiM start codex --as-subagent --model '/tmp/My model.gguf'",
  );
  assert.deepEqual(commands.passThrough, [
    "LAiM_STUDIO_URL=https://shed-topic-remark-arguments.trycloudflare.com LAiM start claude --continue",
    "LAiM_STUDIO_URL=https://shed-topic-remark-arguments.trycloudflare.com LAiM start codex --persist resume --last",
  ]);
  assert.equal(
    commands.dryRun,
    "LAiM_STUDIO_URL=https://shed-topic-remark-arguments.trycloudflare.com LAiM start claude --no-launch",
  );
  assert.match(commands.remoteSetup, /^export LAiM_STUDIO_URL=/);
});

test("VS Code takes the model flags like the other agents", () => {
  assert.equal(
    buildAgentShellCommands(
      "http://127.0.0.1:8888",
      "unix",
      "vscode",
      "--model LAiM/Qwen3-4B-GGUF --gguf-variant Q4_K_M",
    ).primary,
    "LAiM start vscode --model LAiM/Qwen3-4B-GGUF --gguf-variant Q4_K_M",
  );
});

test("the Windows selection reaches every generated command", () => {
  const commands = buildAgentShellCommands(
    REMOTE_STUDIO,
    "windows",
    "claude",
    "--model 'C:\\Models\\My model.gguf'",
  );
  for (const command of [
    commands.primary,
    commands.subagent,
    ...commands.passThrough,
    commands.dryRun,
  ]) {
    assert.match(command, /^\$env:LAiM_STUDIO_URL=/);
  }
  assert.equal(
    commands.subagent,
    '$env:LAiM_STUDIO_URL="https://shed-topic-remark-arguments.trycloudflare.com"; LAiM start claude --as-subagent --model \'C:\\Models\\My model.gguf\'',
  );
  assert.match(commands.remoteSetup, /^\$env:LAiM_STUDIO_URL =/);
});
