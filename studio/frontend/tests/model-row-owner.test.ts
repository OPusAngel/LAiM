// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// Rows drop the "LAiM/" prefix but keep every other owner, which is what
// tells the two apart.

import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMetaToken,
  isLAiMOwner,
  parseMetaTokens,
  splitRepoLabel,
} from "../src/features/model-picker/components/model-selector/row-meta.ts";

test("LAiM is the owner whose prefix rows hide", () => {
  assert.equal(
    isLAiMOwner(splitRepoLabel("LAiM/gemma-4-26b").owner),
    true,
  );
  // Case as the Hub listing returns it.
  assert.equal(isLAiMOwner("LAiM"), true);
  assert.equal(isLAiMOwner("LAiMai"), true);
});

test("other owners keep their prefix", () => {
  assert.equal(isLAiMOwner(splitRepoLabel("Qwen/Qwen3-8B").owner), false);
  assert.equal(isLAiMOwner("LAiM-community"), false);
  // A bare model name has no owner to hide.
  assert.equal(isLAiMOwner(splitRepoLabel("gemma-4-26b").owner), false);
});

test("a sub-billion param count is a param chip, not text beside the name's own", () => {
  const meta = parseMetaTokens("600.0M · GGUF");
  assert.deepEqual(meta.texts, []);
  assert.equal(meta.param, "600.0M");
  assert.deepEqual(classifyMetaToken("600.0M"), { kind: "param", label: "600.0M" });
  assert.deepEqual(classifyMetaToken("0.6B"), { kind: "param", label: "0.6B" });
  // A context length is never read as params.
  assert.equal(classifyMetaToken("128K")?.kind, "text");
});
