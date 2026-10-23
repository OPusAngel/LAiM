// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import assert from "node:assert/strict";
import test from "node:test";

import { classifyLAiMSupport } from "../src/features/hub/lib/LAiM-support.ts";

// The sd.cpp companion mirrors are published as ComfyUI single-file repos: library
// "diffusion-single-file", no pipeline tag, and nothing inside but a VAE or a text encoder. The
// cached-row `companion` flag only reaches rows the machine already downloaded, so the chat
// picker's LAiM Hub search is the other way in -- and a taskless repo used to classify as an
// ordinary chat model there.
test("a taskless companion mirror is not offered as a chat model", () => {
  for (const mirror of [
    {
      modelId: "LAiM/Qwen-Image-ComfyUI",
      tags: ["diffusion-single-file", "vae", "comfyui", "qwen-image"],
      libraryName: "diffusion-single-file",
    },
    {
      modelId: "LAiM/Z-Image-Turbo-ComfyUI",
      tags: ["diffusion-single-file", "vae", "text-encoder", "comfyui", "z-image"],
      libraryName: "diffusion-single-file",
    },
  ]) {
    const support = classifyLAiMSupport({ ...mirror, pipelineTag: null });
    assert.equal(support.status, "unsupported", mirror.modelId);
  }
});

test("a real single-file checkpoint keeps its Images routing", () => {
  // Same library tag, but a pipeline task -- these load on the Images page, so they must stay
  // routed there rather than becoming a blanket "unsupported".
  const support = classifyLAiMSupport({
    modelId: "LAiM/FLUX.2-klein-9B-GGUF",
    pipelineTag: "image-to-image",
    tags: ["gguf", "flux", "diffusion-single-file", "image-to-image"],
    libraryName: "gguf",
  });
  assert.equal(support.status, "unsupported");
  assert.equal(support.supportedIn, "images");
});

test("a chat GGUF that sd.cpp borrows as a text encoder stays supported", () => {
  // LAiM/Qwen2.5-VL-7B-Instruct-GGUF is in the backend's companion set (Qwen-Image's text
  // encoder) yet is a perfectly good chat model: filtering the picker on that set would take it
  // away from a user who downloaded it to chat with.
  const support = classifyLAiMSupport({
    modelId: "LAiM/Qwen2.5-VL-7B-Instruct-GGUF",
    pipelineTag: "image-text-to-text",
    tags: ["transformers", "gguf", "qwen2_5_vl", "image-text-to-text", "multimodal"],
    libraryName: "gguf",
  });
  assert.equal(support.status, "supported");
});
