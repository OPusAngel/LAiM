// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import assert from "node:assert/strict";
import test from "node:test";
import {
  loadWithStubs,
  stubJsxRuntime,
  type StubElement,
} from "./helpers/module-stubs.ts";

function permissionUi(owner: boolean, permissionMode: string, loginMode = "multi") {
  const accountSession = loadWithStubs<{
    useFullAccessAllowed: () => boolean;
  }>(new URL("../src/features/auth/account-session.ts", import.meta.url), {
    react: { useSyncExternalStore: (_subscribe: unknown, snapshot: () => boolean) => snapshot() },
    "./login-client": {
      getFullAccessAllowed: () => loginMode !== "multi",
    },
    "./session": {
      getAuthToken: () => `e30.${Buffer.from(JSON.stringify({
        sub: owner ? "LAiM" : "alice", role: owner ? "owner" : "user",
      })).toString("base64url")}.sig`,
    },
  });
  const changes: string[] = [];
  const state = {
    permissionMode,
    setPermissionMode: (value: string) => {
      changes.push(value);
    },
  };
  const component = loadWithStubs<{
    PermissionModeMenuItems: (props: {
      onRequestFullAccess: () => void;
    }) => StubElement;
    PermissionMenuLabel: () => StubElement;
    PERMISSION_MODE_OPTIONS: readonly {
      value: string;
      label: string;
      description: string;
      icon: string;
    }[];
    permissionModeOption: (mode: string) => { value: string; label: string };
    FullAccessConfirmDialog: (props: {
      open: boolean;
      onOpenChange: () => void;
    }) => StubElement | null;
  }>(
    new URL("../src/features/chat/permission-mode-select.tsx", import.meta.url),
    {
      "react/jsx-runtime": stubJsxRuntime(),
      react: {
        useEffect: (effect: () => void) => effect(),
        useLayoutEffect: (effect: () => void) => effect(),
        useState: (initial: unknown) => [initial, () => {}],
        useId: () => "id",
        useRef: (current: unknown) => ({ current }),
      },
      "lucide-react": {
        ChevronDown: "ChevronDown",
        Hand: "Hand",
        ShieldCheck: "ShieldCheck",
      },
      "radix-ui": {
        DropdownMenu: {
          Item: "DropdownMenuPrimitive.Item",
          Sub: "DropdownMenuPrimitive.Sub",
          SubTrigger: "DropdownMenuPrimitive.SubTrigger",
        },
      },
      "@/features/settings": {
        useSettingsDialogStore: (selector: (state: unknown) => unknown) =>
          selector({
            openDialog: () => {},
          }),
      },
      "@/i18n": { useT: () => (key: string) => key },
      "@/features/auth/account-session": accountSession,
      "@/components/ui/alert-dialog": { AlertDialog: "AlertDialog" },
      "@/components/ui/button": { Button: "Button" },
      "@/components/ui/dropdown-menu": {
        DropdownMenu: "DropdownMenu",
        DropdownMenuContent: "DropdownMenuContent",
        DropdownMenuItem: "DropdownMenuItem",
        DropdownMenuLabel: "DropdownMenuLabel",
        DropdownMenuTrigger: "DropdownMenuTrigger",
      },
      "@/lib/chevron-icons": { ChevronDownStandardIcon: "ChevronDownStandardIcon" },
      "@/lib/agent-core-icons": {
        PlanetCoreGlyph: "PlanetCoreGlyph",
        SaturnCoreGlyph: "SaturnCoreGlyph",
      },
      "@/lib/sparkles-icon": { SparklesGlyph: "SparklesGlyph" },
      "@/lib/shield-alert-icon": { ShieldAlertGlyph: "ShieldAlertGlyph" },
      "@hugeicons/core-free-icons": {},
      "@/lib/tick-icon": { MenuTickIcon: "MenuTickIcon" },
      "@/lib/utils": { cn: () => "" },
      "@hugeicons/react": { HugeiconsIcon: "HugeiconsIcon" },
      "./stores/chat-runtime-store": {
        useChatRuntimeStore: Object.assign(
          (selector: (state: unknown) => unknown) => selector(state),
          { getState: () => state, subscribe: () => () => {} },
        ),
      },
    },
  );
  return { component, changes };
}

/** The option rows the menu paints, in order. */
function menuRows(ui: ReturnType<typeof permissionUi>) {
  const menu = ui.component.PermissionModeMenuItems({ onRequestFullAccess() {} });
  return menu.props.children as StubElement[];
}

for (const loginMode of ["single", "multi"]) {
  for (const owner of [true, false]) {
    test(`${loginMode} permission menu allows full access only for the owner (${owner})`, () => {
      const ui = permissionUi(owner, "full", loginMode);
      const rows = menuRows(ui);
      assert.equal(rows.length, owner ? 2 : 1);
      // A non-owner left on Full access is stepped down to the asking level.
      assert.deepEqual(ui.changes, owner ? [] : ["ask"]);
      const dialog = ui.component.FullAccessConfirmDialog({
        open: true,
        onOpenChange() {},
      });
      assert.equal(dialog === null, !owner);
    });
  }
}

test("multi-user policy leaves a non-full preference untouched", () => {
  const ui = permissionUi(false, "ask");
  menuRows(ui);
  assert.deepEqual(ui.changes, []);
});

test("the stored values keep their order, their names and their planets", () => {
  const ui = permissionUi(true, "auto");
  assert.deepEqual(
    ui.component.PERMISSION_MODE_OPTIONS.map((option) => [
      option.value,
      option.label,
      option.icon,
    ]),
    [
      ["ask", "Agent Core", "PlanetCoreGlyph"],
      ["full", "Agent Core AI", "SaturnCoreGlyph"],
    ],
  );
  // Legacy stored levels ("auto", "off", the sandbox-era names) read as Agent Core.
  assert.equal(ui.component.permissionModeOption("bogus").value, "ask");
});

test("the menu heading says Permissions and offers nothing else", () => {
  const ui = permissionUi(true, "ask", "single");
  const label = ui.component.PermissionMenuLabel();
  // LAiM runs every tool on the host with full rights, so the heading is one span
  // and the menu has no second control beside it.
  const children = label.props.children as StubElement;
  assert.equal(children.props.children, "settings.general.permissions.sectionTitle");
});

test("picking a level applies it, and picking Full access asks first", () => {
  let requested = 0;
  const ui = permissionUi(true, "ask", "single");
  const component = ui.component;
  const rows = component.PermissionModeMenuItems({
    onRequestFullAccess: () => {
      requested += 1;
    },
  }).props.children as StubElement[];
  // Already on Agent Core: picking it again is a no-op.
  (rows[0].props.onSelect as () => void)();
  assert.deepEqual(ui.changes, []);
  (rows[1].props.onSelect as () => void)();
  assert.equal(requested, 1);
  assert.deepEqual(ui.changes, []);

  const fromFull = permissionUi(true, "full", "single");
  const fullRows = menuRows(fromFull);
  (fullRows[0].props.onSelect as () => void)();
  assert.deepEqual(fromFull.changes, ["ask"]);
});
