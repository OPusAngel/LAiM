// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";

register("./helpers/browser-executor-resolver.mjs", import.meta.url);
const { runBrowserAction } = await import("../src/features/browser/agent/executor.ts");
const { agentChat, useBrowserAgentStore } = await import("../src/features/browser/agent/agent-store.ts");

const CHAT = "new";
// One action id is one action: runBrowserAction drops a second call that repeats one.
let nextId = 0;
const id = () => `a${++nextId}`;
const globals = globalThis as Record<string, unknown>;
const policy = { allowedDomains: [], blockedDomains: [] };
const PAGE = "https://forms.example/upload";

const fileField = {
  role: "textbox",
  name: "",
  tag: "input",
  type: "file",
  href: "",
  formMethod: "",
  formAction: "",
  formHasPassword: false,
  submits: false,
};

/** One upload with the page answering every op; returns what the page got and what was posted back. */
async function upload(
  action: Record<string, unknown>,
  fileBytes: Uint8Array,
  answers: (op: Record<string, unknown>) => unknown | undefined,
) {
  const pageOps: Record<string, unknown>[] = [];
  const posted: { result: Record<string, unknown> }[] = [];
  globals.__authFetch = async (url: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}) => {
    if (url.startsWith("/api/browser/local-file")) {
      // The HEAD says how big the file is, exactly as Studio's own route does; a ranged GET is
      // that slice of it, which is what the executor pieces the file by.
      if (init.method === "HEAD") {
        return new Response(null, { status: 200, headers: { "content-length": String(fileBytes.length) } });
      }
      const range = /bytes=(\d+)-(\d+)/.exec(init.headers?.Range ?? "");
      const slice = range ? fileBytes.subarray(Number(range[1]), Number(range[2]) + 1) : fileBytes;
      return new Response(slice.slice().buffer as ArrayBuffer, { status: 200 });
    }
    posted.push(JSON.parse(String(init.body)));
    return new Response(null, { status: 200 });
  };
  globals.__frameAgent = async (_tabId: string, op: Record<string, unknown>) => {
    pageOps.push(op);
    if (op.op === "status") return { installed: true, result: { ok: true, quietMs: 1000, doc: "r1" } };
    if (op.op === "describe") return { installed: true, result: { ok: true, info: fileField, hit: "r12", sig: "s" } };
    if (op.op === "upload") {
      const answer = answers(op);
      return { installed: true, result: answer ?? { ok: true } };
    }
    return { installed: true, result: { ok: true, text: "the page", links: [] } };
  };
  const run = { runKey: "r", userText: `upload to ${PAGE}` };
  await runBrowserAction({ id: id(), sessionId: "s", op: "navigate", url: PAGE, direction: "down", policy }, run);
  await runBrowserAction({ id: id(), sessionId: "s", op: "upload", direction: "down", policy, ...action }, run);
  return { pageOps, posted };
}

const bytesOf = (text: string) => new TextEncoder().encode(text);

test("a file goes into the field without a dialog and without asking the user", async () => {
  // LAiM ships the browser agent with full rights, so the file leaves with no prompt at all.
  useBrowserAgentStore.setState({ scriptAccess: "allow" });
  const { pageOps, posted } = await upload({ ref: "r12", path: "C:\\Users\\M\\Documents\\отчёт.pdf" }, bytesOf("%PDF-1.4\n"), () => undefined);
  const uploads = pageOps.filter((op) => op.op === "upload");
  assert.equal(uploads.length, 1, "the file went in more than one piece, or not at all");
  assert.equal(uploads[0].name, "отчёт.pdf");
  assert.equal(uploads[0].mime, "application/pdf");
  assert.equal(uploads[0].more, false, "the last piece is the one that fills the field");
  assert.equal(uploads[0].ref, "r12");
  assert.ok(!agentChat(CHAT).question, "the upload was asked about");
  const note = JSON.stringify(posted.at(-1)?.result);
  assert.match(note, /отчёт\.pdf/, "the answer the model got does not name the file");
});

test("one big file arrives as pieces and only the last one fills the field", async () => {
  const big = new Uint8Array(32_768 * 2 + 7);
  const { pageOps } = await upload({ ref: "r12", path: "/home/user/video.mp4" }, big, () => undefined);
  const uploads = pageOps.filter((op) => op.op === "upload");
  assert.equal(uploads.length, 3);
  assert.deepEqual(uploads.map((op) => op.more), [true, true, false]);
  assert.equal(uploads[0].mime, "video/mp4");
});

test("a page that stops answering mid-upload is reported as stopped, not as filed", async () => {
  // Several pieces, so a page that refuses the second one is still mid-file.
  const big = new Uint8Array(100_000);
  let seen = 0;
  const { pageOps, posted } = await upload({ ref: "r12", path: "/home/user/data.csv" }, big, () => {
    seen += 1;
    // The first piece is still on its way in, so a page that stops replying here leaves the
    // file half-downloaded rather than filed.
    if (seen === 1) return undefined;
    throw new Error("no answer from the page");
  });
  assert.equal(pageOps.filter((op) => op.op === "upload").length, 2, "bytes kept going after the page refused");
  assert.match(JSON.stringify(posted.at(-1)?.result), /stopped|again/, "the model was told the file was added");
});

test("a field that is not a file picker is refused before any byte is read", async () => {
  globals.__frameAgent = async (_tabId: string, op: Record<string, unknown>) => {
    if (op.op === "status") return { installed: true, result: { ok: true, quietMs: 1000, doc: "r1" } };
    if (op.op === "describe") {
      return { installed: true, result: { ok: true, info: { ...fileField, tag: "input", type: "text" }, hit: "r12", sig: "s" } };
    }
    return { installed: true, result: { ok: true, text: "the page", links: [] } };
  };
  let readDisk = false;
  globals.__authFetch = async (url: string, _init: { method?: string; body?: string } = {}) => {
    if (url.startsWith("/api/browser/local-file")) {
      readDisk = true;
      return new Response(null, { status: 200, headers: { "content-length": "4" } });
    }
    return new Response(null, { status: 200 });
  };
  const run = { runKey: "r", userText: `upload to ${PAGE}` };
  await runBrowserAction({ id: "u1", sessionId: "s", op: "navigate", url: PAGE, direction: "down", policy }, run);
  await runBrowserAction({ id: "u1", sessionId: "s", op: "upload", ref: "r12", path: "C:\\secrets.txt", direction: "down", policy }, run);
  assert.equal(readDisk, false, "a text field was fed the bytes of a file the page cannot hold");
});
