// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOUNT_CHROME_KEYS,
  ACCOUNT_DATABASES,
  BROWSER_ACCOUNT_FENCE_KEY,
  BROWSER_ACCOUNT_KEY,
  accountDatabaseName,
  accountTransitionPending,
  browserAccountMarker,
  installAccountTransitionListener,
  normalizeAccountUsername,
  resetFullAccessForMultiUser,
  transitionBrowserAccount,
} from "../src/lib/account-transition.ts";
import { RUNTIME_REPAIR_KEY } from "../src/hooks/runtime-repair-history.ts";

function browserWith(
  values: Record<string, string> = {},
  databaseResult = "success",
  sessionValues: Record<string, string> = {},
) {
  const data = new Map(Object.entries(values));
  const sessionData = new Map(Object.entries(sessionValues));
  const removed: string[] = [];
  const deleted: string[] = [];
  const replaced: string[] = [];
  let reloads = 0;
  const listeners: ((event: Partial<StorageEvent>) => void)[] = [];
  const storage = {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      removed.push(key);
      data.delete(key);
    },
  } as Storage;
  const sessionStorage = {
    get length() {
      return sessionData.size;
    },
    key: (index: number) => [...sessionData.keys()][index] ?? null,
    getItem: (key: string) => sessionData.get(key) ?? null,
    setItem: (key: string, value: string) => {
      sessionData.set(key, value);
    },
    removeItem: (key: string) => {
      sessionData.delete(key);
    },
  } as Storage;
  const browser = {
    localStorage: storage,
    sessionStorage,
    indexedDB: {
      deleteDatabase: (name: string) => {
        deleted.push(name);
        const request = {} as IDBOpenDBRequest;
        queueMicrotask(() => {
          const callback =
            databaseResult === "blocked"
              ? request.onblocked
              : databaseResult === "error"
                ? request.onerror
                : request.onsuccess;
          callback?.call(request, {} as IDBVersionChangeEvent);
        });
        return request;
      },
    },
    location: {
      replace: (route: string) => {
        replaced.push(route);
      },
      reload: () => {
        reloads++;
      },
    },
    addEventListener: (
      _type: string,
      listener: (event: Partial<StorageEvent>) => void,
    ) => {
      listeners.push(listener);
    },
  } as unknown as Window;
  return {
    browser,
    data,
    sessionData,
    removed,
    deleted,
    replaced,
    listeners,
    reloads: () => reloads,
  };
}

for (const marker of [undefined, "LAiM"]) {
  test(`single-user login never purges, marker ${marker ?? "absent"}`, async () => {
    const b = browserWith({
      LAiM_chat_permission_mode: "full",
      "chat-draft:1": "keep",
      ...(marker ? { [BROWSER_ACCOUNT_KEY]: marker } : {}),
    });
    let committed = 0;
    assert.equal(
      await transitionBrowserAccount(
        " LAiM ",
        "/chat",
        () => {
          committed++;
        },
        b.browser,
      ),
      false,
    );
    assert.equal(committed, 1);
    assert.deepEqual(b.removed, []);
    assert.deepEqual(b.deleted, []);
    assert.deepEqual(b.replaced, []);
    assert.equal(b.data.get("LAiM_chat_permission_mode"), "full");
  });
}

test("switch removes every content prefix and preserves only listed chrome and unrelated keys", async () => {
  const chrome = Object.fromEntries(
    [...ACCOUNT_CHROME_KEYS].map((key) => [key, "chrome"]),
  );
  const content = [
    "LAiM_auth_token",
    "LAiM_hf_token",
    "LAiM_new_feature",
    "LAiM_chat_permission_mode",
    "LAiM-profile",
    "chat-draft:1",
    "chat-draft-pastes:2",
  ];
  const b = browserWith({
    ...chrome,
    ...Object.fromEntries(content.map((key) => [key, "private"])),
    unrelated: "keep",
    "LAiM_web_update_dismissed:pip:1": "keep",
    [BROWSER_ACCOUNT_KEY]: "LAiM",
  });
  const changed = await transitionBrowserAccount(
    "Alice",
    "/change-password",
    () => {
      assert.deepEqual(b.deleted, [...ACCOUNT_DATABASES]);
      assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "LAiM");
      b.data.set("LAiM_auth_token", "alice-token");
    },
    b.browser,
  );
  assert.equal(changed, true);
  // The fence is written before the tokens and lifted after the marker.
  assert.deepEqual(b.removed.sort(), [...content, BROWSER_ACCOUNT_FENCE_KEY].sort());
  for (const key of ACCOUNT_CHROME_KEYS)
    assert.equal(b.data.get(key), "chrome");
  assert.equal(b.data.get("unrelated"), "keep");
  assert.equal(b.data.get("LAiM_web_update_dismissed:pip:1"), "keep");
  assert.equal(b.data.get("LAiM_auth_token"), "alice-token");
  assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "alice");
  assert.deepEqual(b.replaced, ["/change-password"]);
});

test("only a switch clears the desktop browser's site data, before the new session", async () => {
  const events: string[] = [];
  const clear = async () => {
    events.push("clear");
  };
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "alice" });
  await transitionBrowserAccount("alice", "/chat", () => events.push("same"), b.browser, clear);
  await transitionBrowserAccount("bob", "/chat", () => events.push("bob"), b.browser, clear);
  assert.deepEqual(events, ["same", "clear", "bob"]);
  const failing = browserWith({ [BROWSER_ACCOUNT_KEY]: "bob", "LAiM-draft": "kept" });
  await assert.rejects(
    transitionBrowserAccount("carol", "/chat", () => events.push("carol"), failing.browser, () =>
      Promise.reject(new Error("clear failed")),
    ),
  );
  assert.equal(events.includes("carol"), false);
  // The clear runs first, so a failed one leaves the signed-in account's data whole.
  assert.equal(failing.browser.localStorage.getItem("LAiM-draft"), "kept");
});

test("a switch keeps the machine's llama.cpp runtime repair record", async () => {
  const b = browserWith({ [RUNTIME_REPAIR_KEY]: "repaired", LAiM_auth_token: "owner" });
  assert.equal(await transitionBrowserAccount("alice", "/chat", () => {}, b.browser), true);
  assert.equal(b.data.get(RUNTIME_REPAIR_KEY), "repaired");
  assert.equal(b.data.has("LAiM_auth_token"), false);
});

test("a first managed login clears legacy owner data even without a marker", async () => {
  const b = browserWith({ "LAiM-old-content": "owner" });
  assert.equal(
    await transitionBrowserAccount("alice", "/chat", () => {}, b.browser),
    true,
  );
  assert.deepEqual(b.removed, ["LAiM-old-content", BROWSER_ACCOUNT_FENCE_KEY]);
});

test("same managed account keeps content and avoids IndexedDB work", async () => {
  const b = browserWith({
    [BROWSER_ACCOUNT_KEY]: "alice",
    "chat-draft:1": "alice",
  });
  await transitionBrowserAccount("ALICE", "/chat", () => {}, b.browser);
  assert.deepEqual(b.removed, []);
  assert.deepEqual(b.deleted, []);
  assert.deepEqual(b.replaced, []);
});

test("a username created again as a different account inherits nothing", async () => {
  const b = browserWith({});
  await transitionBrowserAccount(
    { username: "alice", accountId: "a1" },
    "/chat",
    () => {},
    b.browser,
  );
  b.data.set("chat-draft:1", "first alice");
  b.data.set("LAiM_hf_token", "first alice");
  const deletedOnFirstLogin = b.deleted.length;
  const changed = await transitionBrowserAccount(
    { username: "alice", accountId: "a2" },
    "/chat",
    () => {},
    b.browser,
  );
  assert.equal(changed, true);
  assert.equal(b.data.has("chat-draft:1"), false);
  assert.equal(b.data.has("LAiM_hf_token"), false);
  assert.deepEqual(b.deleted.slice(deletedOnFirstLogin), [
    ...ACCOUNT_DATABASES,
  ]);
  assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "account:a2:alice");
});

test("one account keeps its data across a rename", async () => {
  const b = browserWith({
    [BROWSER_ACCOUNT_KEY]: browserAccountMarker({
      username: "alice",
      accountId: "a1",
    }),
    "chat-draft:1": "alice",
  });
  assert.equal(
    await transitionBrowserAccount(
      { username: "Alice2", accountId: "a1" },
      "/chat",
      () => {},
      b.browser,
    ),
    false,
  );
  assert.deepEqual(b.removed, []);
  assert.deepEqual(b.deleted, []);
  assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "account:a1:alice2");
});

test("a marker written before account ids upgrades in place", async () => {
  const b = browserWith({
    [BROWSER_ACCOUNT_KEY]: "alice",
    "chat-draft:1": "alice",
  });
  assert.equal(
    await transitionBrowserAccount(
      { username: "alice", accountId: "a1" },
      "/chat",
      () => {},
      b.browser,
    ),
    false,
  );
  assert.deepEqual(b.removed, []);
  assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "account:a1:alice");
});

test("a server that sends no account id keeps the session on the username", async () => {
  for (const account of [
    "alice",
    { username: "alice", accountId: null },
  ] as const) {
    const b = browserWith({
      [BROWSER_ACCOUNT_KEY]: "account:a1:alice",
      "chat-draft:1": "alice",
    });
    assert.equal(
      await transitionBrowserAccount(account, "/chat", () => {}, b.browser),
      false,
    );
    assert.deepEqual(b.removed, []);
    assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "alice");
  }
});

for (const marker of [undefined, "LAiM"]) {
  test(`an owner-only install never purges when ids arrive, marker ${marker ?? "absent"}`, async () => {
    const b = browserWith({
      "chat-draft:1": "keep",
      ...(marker ? { [BROWSER_ACCOUNT_KEY]: marker } : {}),
    });
    assert.equal(
      await transitionBrowserAccount(
        { username: "LAiM", accountId: "owner" },
        "/chat",
        () => {},
        b.browser,
      ),
      false,
    );
    assert.deepEqual(b.removed, []);
    assert.deepEqual(b.deleted, []);
    assert.deepEqual(b.replaced, []);
    assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "account:owner:LAiM");
  });
}

test("a marker no build wrote can only compare as a different account", async () => {
  const b = browserWith({
    [BROWSER_ACCOUNT_KEY]: "account:",
    "LAiM-private": "x",
  });
  assert.equal(
    await transitionBrowserAccount(
      { username: "alice", accountId: "a1" },
      "/chat",
      () => {},
      b.browser,
    ),
    true,
  );
  assert.equal(b.data.has("LAiM-private"), false);
});

test("returning to the owner clears the previous managed account", async () => {
  const b = browserWith({
    [BROWSER_ACCOUNT_KEY]: "alice",
    "LAiM-private": "alice",
  });
  assert.equal(
    await transitionBrowserAccount("LAiM", "/chat", () => {}, b.browser),
    true,
  );
  assert.equal(b.data.has("LAiM-private"), false);
});

for (const failure of ["blocked", "error"]) {
  test(`IndexedDB ${failure} prevents new session publication and navigation`, async () => {
    const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "LAiM" }, failure);
    let committed = false;
    await assert.rejects(
      transitionBrowserAccount(
        "alice",
        "/chat",
        () => {
          committed = true;
        },
        b.browser,
      ),
    );
    assert.equal(committed, false);
    assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "LAiM");
    assert.deepEqual(b.replaced, []);
  });
}

test("cross-tab switches reload once, ignoring initial owner markers, removals and unrelated storage", () => {
  const b = browserWith();
  installAccountTransitionListener(b.browser);
  installAccountTransitionListener(b.browser);
  assert.equal(b.listeners.length, 1);
  const send = b.listeners[0];
  send({ key: BROWSER_ACCOUNT_KEY, oldValue: null, newValue: "LAiM" });
  send({ key: "unrelated", oldValue: "a", newValue: "b" });
  send({ key: BROWSER_ACCOUNT_KEY, oldValue: "alice", newValue: null });
  send({ key: BROWSER_ACCOUNT_KEY, oldValue: "alice", newValue: "ALICE" });
  send({
    key: BROWSER_ACCOUNT_KEY,
    oldValue: "LAiM",
    newValue: "alice",
    storageArea: {} as Storage,
  });
  assert.equal(b.reloads(), 0);
  send({
    key: BROWSER_ACCOUNT_KEY,
    oldValue: "LAiM",
    newValue: "alice",
    storageArea: b.browser.localStorage,
  });
  send({ key: BROWSER_ACCOUNT_KEY, oldValue: "alice", newValue: "bob" });
  assert.equal(b.reloads(), 1);
});

test("a switch fences peers before the new tokens and lifts the fence after the marker", async () => {
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "LAiM", LAiM_auth_token: "alice-token" });
  let fenceAtCommit: string | null = null;
  await transitionBrowserAccount(
    { username: "bob", accountId: "b1" },
    "/chat",
    () => {
      fenceAtCommit = b.data.get(BROWSER_ACCOUNT_FENCE_KEY) ?? null;
      b.data.set("LAiM_auth_token", "bob-token");
    },
    b.browser,
  );
  assert.equal(fenceAtCommit, "account:b1:bob");
  assert.equal(b.data.has(BROWSER_ACCOUNT_FENCE_KEY), false);
  assert.equal(b.data.get(BROWSER_ACCOUNT_KEY), "account:b1:bob");
});

test("a peer holds requests from the fence until the marker reloads it", () => {
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "LAiM" });
  installAccountTransitionListener(b.browser);
  const send = b.listeners[0];
  assert.equal(accountTransitionPending(), false);
  send({ key: BROWSER_ACCOUNT_FENCE_KEY, oldValue: null, newValue: "LAiM" });
  assert.equal(accountTransitionPending(), false);
  send({ key: BROWSER_ACCOUNT_FENCE_KEY, oldValue: null, newValue: "account:b1:bob" });
  assert.equal(accountTransitionPending(), true);
  assert.equal(b.reloads(), 0);
  send({ key: BROWSER_ACCOUNT_KEY, oldValue: "LAiM", newValue: "account:b1:bob" });
  assert.equal(b.reloads(), 1);
  send({ key: BROWSER_ACCOUNT_FENCE_KEY, oldValue: "account:b1:bob", newValue: null });
  assert.equal(b.reloads(), 1);
});

test("cross-tab reloads follow the account id, not the name", () => {
  const upgrade = browserWith();
  installAccountTransitionListener(upgrade.browser);
  upgrade.listeners[0]({
    key: BROWSER_ACCOUNT_KEY,
    oldValue: "alice",
    newValue: "account:a1:alice",
    storageArea: upgrade.browser.localStorage,
  });
  assert.equal(upgrade.reloads(), 0);
  const recreated = browserWith();
  installAccountTransitionListener(recreated.browser);
  recreated.listeners[0]({
    key: BROWSER_ACCOUNT_KEY,
    oldValue: "account:a1:alice",
    newValue: "account:a2:alice",
    storageArea: recreated.browser.localStorage,
  });
  assert.equal(recreated.reloads(), 1);
});

test("a marker carries the account id and the normalized name", () => {
  assert.equal(browserAccountMarker(" ALICE "), "alice");
  assert.equal(
    browserAccountMarker({ username: " ALICE ", accountId: "a1" }),
    "account:a1:alice",
  );
  assert.throws(() =>
    browserAccountMarker({ username: "  ", accountId: "a1" }),
  );
});

test("multi-user policy resets full while preserving other permission modes", () => {
  const b = browserWith({ LAiM_chat_permission_mode: "full" });
  resetFullAccessForMultiUser(b.browser.localStorage);
  assert.equal(b.data.get("LAiM_chat_permission_mode"), "auto");
  for (const mode of ["ask", "auto", "off"]) {
    b.data.set("LAiM_chat_permission_mode", mode);
    resetFullAccessForMultiUser(b.browser.localStorage);
    assert.equal(b.data.get("LAiM_chat_permission_mode"), mode);
  }
});

test("username normalization matches the ASCII names the backend can store", () => {
  for (const [input, expected] of [
    [" LAiM ", "LAiM"],
    ["Alice_01", "alice_01"],
    ["BOB-2", "bob-2"],
    [" Straße ", "straße"],
  ])
    assert.equal(normalizeAccountUsername(input), expected);
});

test("a legacy marker still compares on the name when neither side has an id", async () => {
  const same = browserWith({
    [BROWSER_ACCOUNT_KEY]: "alice",
    "LAiM-private": "alice",
  });
  assert.equal(
    await transitionBrowserAccount(" ALICE ", "/chat", () => {}, same.browser),
    false,
  );
  assert.equal(same.data.get("LAiM-private"), "alice");
  const other = browserWith({
    [BROWSER_ACCOUNT_KEY]: "alice",
    "LAiM-private": "alice",
  });
  assert.equal(
    await transitionBrowserAccount("bob", "/chat", () => {}, other.browser),
    true,
  );
  assert.equal(other.data.has("LAiM-private"), false);
});

test("switching accounts clears the legacy browser-only chat store", async () => {
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "LAiM" });
  await transitionBrowserAccount("alice", "/chat", () => {}, b.browser);
  assert.ok(b.deleted.includes("LAiM-chat"));
});

test("the owner's own first login keeps the legacy chat store to import", async () => {
  const b = browserWith({});
  await transitionBrowserAccount("LAiM", "/chat", () => {}, b.browser);
  assert.deepEqual(b.deleted, []);
});

test("switching accounts clears session content and keeps neutral session flags", async () => {
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "alice" }, "success", {
    "chat:training-compare-handoff:v1": JSON.stringify({
      intent: "compare",
      baseModel: "alice-private/base",
      requestedAt: Date.now(),
    }),
    "LAiM.reload-snapshot.v1": "<div>alice</div>",
    "data-recipes:open-learning-recipes": "1",
    // USER_STOPPED_KEY: neutral, and clearing it would restart a server the user stopped.
    LAiM_server_user_stopped: "1",
  });
  assert.equal(
    await transitionBrowserAccount("bob", "/chat", () => {}, b.browser),
    true,
  );
  assert.equal(b.sessionData.has("chat:training-compare-handoff:v1"), false);
  assert.equal(b.sessionData.has("LAiM.reload-snapshot.v1"), false);
  assert.equal(b.sessionData.has("data-recipes:open-learning-recipes"), false);
  assert.equal(b.sessionData.get("LAiM_server_user_stopped"), "1");
});

test("the same account keeps a pending compare handoff", async () => {
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "alice" }, "success", {
    "chat:training-compare-handoff:v1": "pending",
  });
  assert.equal(
    await transitionBrowserAccount("ALICE", "/chat", () => {}, b.browser),
    false,
  );
  assert.equal(
    b.sessionData.get("chat:training-compare-handoff:v1"),
    "pending",
  );
});

test("unreadable session storage never fails a sign-in", async () => {
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "alice" });
  Object.defineProperty(b.browser, "sessionStorage", {
    get() {
      throw new Error("blocked");
    },
  });
  assert.equal(
    await transitionBrowserAccount("bob", "/chat", () => {}, b.browser),
    true,
  );
});

test("saved recipes live in a per-account store and are never purged", () => {
  assert.equal(
    ACCOUNT_DATABASES.includes("LAiM-data-recipes" as never),
    false,
  );
  const stored = (marker: string | null) => ({ getItem: () => marker });
  assert.equal(
    accountDatabaseName("LAiM-data-recipes", stored(null)),
    "LAiM-data-recipes",
  );
  assert.equal(
    accountDatabaseName("LAiM-data-recipes", stored("LAiM")),
    "LAiM-data-recipes",
  );
  assert.equal(
    accountDatabaseName(
      "LAiM-data-recipes",
      stored("account:owner:LAiM"),
    ),
    "LAiM-data-recipes",
  );
  assert.equal(
    accountDatabaseName("LAiM-data-recipes", stored("account:a1:alice")),
    "LAiM-data-recipes:a1",
  );
  assert.equal(
    accountDatabaseName("LAiM-data-recipes", stored("alice")),
    "LAiM-data-recipes:alice",
  );
});

test("transcript recovery survives reauthentication but is cleared on account changes", async () => {
  const { readTranscriptDraft, transcriptDraftKey, writeTranscriptDraft } =
    await import("../src/features/audio/transcript-draft.ts");
  const b = browserWith({ [BROWSER_ACCOUNT_KEY]: "account:alice-id:alice" });
  const originals = ["window", "sessionStorage"].map((name) => [
    name, Object.getOwnPropertyDescriptor(globalThis, name),
  ] as const);
  Object.defineProperty(globalThis, "window", { configurable: true, value: b.browser });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true, value: b.browser.sessionStorage,
  });
  try {
    const key = transcriptDraftKey();
    const draft = { text: "keep this transcript", title: "speech.wav", model: "tiny" };
    assert.equal(writeTranscriptDraft(key, draft), true);
    b.data.delete("LAiM_auth_token");
    await transitionBrowserAccount(
      { username: "alice", accountId: "alice-id" }, "/chat", () => {}, b.browser,
    );
    assert.deepEqual(readTranscriptDraft(transcriptDraftKey()), draft);
    await transitionBrowserAccount(
      { username: "bob", accountId: "bob-id" }, "/chat", () => {}, b.browser,
    );
    assert.notEqual(transcriptDraftKey(), key);
    assert.equal(readTranscriptDraft(key), null);
    assert.equal(readTranscriptDraft(transcriptDraftKey()), null);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
