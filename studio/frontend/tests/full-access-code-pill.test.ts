// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// Every checkpoint runs LAiM's code tools, local or cloud: there is no pill to decline them,
// and the switch that owns the preference lives outside the composer.

import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import { installLocalStorageFake } from "./helpers/kit.ts";
import {
  drainMockedTimers,
  enableCountedTimers,
} from "./helpers/mock-timer-drain.ts";

const { store: localStorageFake } = installLocalStorageFake();
localStorageFake.set("LAiM_chat_settings_imported_to_studio_db", "true");
register("./thread-sampling-resolver.mjs", import.meta.url);

const { settingsHttp } = await import("./helpers/store-stubs/settings-http.ts");
const { threadRows } = await import(
  "./helpers/store-stubs/chat-history-storage.ts"
);

const STORE_URL = new URL(
  "../src/features/chat/stores/chat-runtime-store.ts",
  import.meta.url,
).href;
const CODE_KEY = "LAiM_chat_code_tools_enabled";
const LOCAL = "unsloth/Qwen3-1.7B-GGUF";
const EXTERNAL = "external::anthropic::claude-opus-5";

type Store = Record<string, (...args: never[]) => unknown> & {
  params: { checkpoint: string };
  codeToolsEnabled: boolean;
  permissionMode: string;
};

interface StoreModule {
  useChatRuntimeStore: {
    getState: () => Store;
    setState: (patch: Record<string, unknown>) => void;
  };
  codeToolsOn: (state: Store) => boolean;
  beginThreadScopedPairing: (threadId: string) => void;
  awaitStartedThreadScopedSettingsWrites: () => Promise<void>;
}

let scenario = 0;

/** A fresh store with `checkpoint` selected and Code stored as `codeOn`. */
async function freshStore(
  codeOn: boolean,
  checkpoint = LOCAL,
  supportsTools = true,
) {
  scenario += 1;
  localStorageFake.set(CODE_KEY, String(codeOn));
  settingsHttp.settings = { codeToolsEnabled: codeOn };
  settingsHttp.puts.length = 0;
  threadRows.reset();
  const mod: StoreModule = await import(
    `${STORE_URL}?scenario=fullaccess${scenario}`
  );
  const store = mod.useChatRuntimeStore;
  store.setState({
    params: { ...store.getState().params, checkpoint },
    supportsTools,
  });
  const on = () => mod.codeToolsOn(store.getState());
  return { mod, store, on, state: () => store.getState() };
}

function pick(state: Store, mode: string) {
  (state.setPermissionMode as (mode: string) => void)(mode);
}

function clickCode(state: Store, next: boolean) {
  (state.setCodeToolsEnabled as (enabled: boolean) => void)(next);
}

test("a local checkpoint runs the code tools even with the stored pill off", async () => {
  const { on } = await freshStore(false);
  assert.equal(on(), true);
});

test("a local checkpoint without a tool-capable template still runs them", async () => {
  const { on } = await freshStore(false, LOCAL, false);
  assert.equal(on(), true);
});

test("no permission level switches a local checkpoint's tools off", async () => {
  const { on, state } = await freshStore(false);
  for (const mode of ["full", "ask", "auto", "off"]) {
    pick(state(), mode);
    assert.equal(on(), true, mode);
  }
});

test("the legacy bypass toggle cannot switch them off either", async () => {
  const { on, state } = await freshStore(false);
  (state().setBypassPermissions as (on: boolean) => void)(true);
  assert.equal(on(), true);
  (state().setBypassPermissions as (on: boolean) => void)(false);
  assert.equal(on(), true);
});

test("a cloud connection runs the code tools exactly like a local one", async () => {
  const { on, state } = await freshStore(false, EXTERNAL);
  assert.equal(on(), true);
  pick(state(), "full");
  assert.equal(on(), true, "the level never gates the effective switch");
  clickCode(state(), true);
  assert.equal(on(), true);
  clickCode(state(), false);
  assert.equal(on(), true, "a stored decline never starves a cloud chat of tools");
});

test("a cloud opt-in is the user's and persists", async () => {
  const { on, state } = await freshStore(false, EXTERNAL);
  clickCode(state(), true);
  assert.equal(on(), true);
  assert.equal(localStorageFake.get(CODE_KEY), "true");
});

test("a local turn never writes the cloud opt-in", async (t) => {
  enableCountedTimers(t);
  const tick = (ms: number) => t.mock.timers.tick(ms);
  const { mod, on, state } = await freshStore(false);
  const drain = () =>
    drainMockedTimers(tick, {
      label: "full access drain",
      barrier: () => mod.awaitStartedThreadScopedSettingsWrites(),
    });
  await (state().hydratePersistedSettings as () => Promise<void>)();
  await drain();
  (state().setActiveThreadId as (id: string) => void)("A");
  mod.beginThreadScopedPairing("A");
  (state().applyThreadScopedSettings as (id: string, s: null) => void)(
    "A",
    null,
  );
  assert.equal(on(), true);
  // Any per-chat edit writes the chat's whole snapshot; the enforced local default
  // must not leak into it as if the user had flipped a cloud pill.
  (state().setToolsEnabled as (on: boolean) => void)(true);
  await drain();
  const row = threadRows.rows.get("A") as Record<string, unknown> | undefined;
  assert.ok(row, "the edit wrote chat A's snapshot");
  assert.notEqual(row.codeToolsEnabled, true);
  assert.equal(localStorageFake.get(CODE_KEY), "false");
  for (const put of settingsHttp.puts) {
    assert.notEqual(put.codeToolsEnabled, true);
  }
});

test("a local chat opened after a cloud chat still runs the code tools", async (t) => {
  enableCountedTimers(t);
  const tick = (ms: number) => t.mock.timers.tick(ms);
  const { mod, store, on, state } = await freshStore(false, EXTERNAL);
  const drain = () =>
    drainMockedTimers(tick, {
      label: "cross-chat drain",
      barrier: () => mod.awaitStartedThreadScopedSettingsWrites(),
    });
  await (state().hydratePersistedSettings as () => Promise<void>)();
  await drain();
  assert.equal(on(), true, "the cloud connection runs the tools from the start");

  (state().setActiveThreadId as (id: string) => void)("B");
  mod.beginThreadScopedPairing("B");
  (
    state().applyThreadScopedSettings as (
      id: string,
      s: Record<string, unknown>,
    ) => void
  )("B", { codeToolsEnabled: false, permissionMode: "auto" });
  await drain();
  assert.equal(on(), true, "a stored decline never starves the cloud chat");

  (state().setActiveThreadId as (id: string) => void)("C");
  mod.beginThreadScopedPairing("C");
  (
    state().applyThreadScopedSettings as (
      id: string,
      s: Record<string, unknown>,
    ) => void
  )("C", { checkpoint: LOCAL, codeToolsEnabled: false, permissionMode: "auto" });
  store.setState({ params: { ...state().params, checkpoint: LOCAL } });
  assert.equal(on(), true, "the local checkpoint gets them regardless");
});
