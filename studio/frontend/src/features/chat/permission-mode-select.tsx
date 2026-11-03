// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { ChevronDown } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { useFullAccessAllowed } from "@/features/auth/account-session";
import { useSettingsDialogStore } from "@/features/settings";
import { translate, useT } from "@/i18n";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownStandardIcon } from "@/lib/chevron-icons";
import { PlanetCoreGlyph, SaturnCoreGlyph } from "@/lib/agent-core-icons";
import { ShieldAlertGlyph } from "@/lib/shield-alert-icon";
import { MenuTickIcon } from "@/lib/tick-icon";
import { cn } from "@/lib/utils";
import {
  ComputerTerminal01Icon,
  Folder01Icon,
  InternetIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  type PermissionMode,
  useChatRuntimeStore,
} from "./stores/chat-runtime-store";

/** Permission levels for tool calls. Full access stays last because it also disables approval
 *  prompts. LAiM ships two agent modes: Agent Core (asks before every action, runs on the host)
 *  and Full Agent Core (asks nothing, runs on the host). Both are the same planet; the ring is
 *  what says "full". */
export const PERMISSION_MODE_OPTIONS: readonly {
  value: PermissionMode;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  {
    value: "ask",
    get label() {
      return translate("uxChat.agentCore1np17");
    },
    get description() { return translate("uxChat.theAITakesActions39693"); },
    icon: PlanetCoreGlyph,
  },
  {
    value: "full",
    get label() {
      return translate("uxChat.agentFullCore104ii");
    },
    get description() { return translate("uxChat.fullAccessTheAIlrx31"); },
    icon: SaturnCoreGlyph,
  },
] as const;

/** What Full access opens up, listed in its confirmation. */
const FULL_ACCESS_SCOPES = [
  {
    icon: Folder01Icon,
    get title() {
      return translate("shell.search.tabs.files");
    },
    get description() {
      return translate("uxChat.readChangeOrDeletetcntr");
    },
  },
  {
    icon: ComputerTerminal01Icon,
    get title() {
      return translate("uxChat.commands15x4m");
    },
    get description() {
      return translate("uxChat.runTerminalAndPythonpor8s");
    },
  },
  {
    // The app's own internet glyph, as on Web search.
    icon: InternetIcon,
    get title() {
      return translate("uxChat.internet1cm29");
    },
    get description() {
      return translate("uxChat.browseSendDataAndccs0l");
    },
  },
] as const;

export function permissionModeOption(mode: PermissionMode) {
  return (
    PERMISSION_MODE_OPTIONS.find((option) => option.value === mode) ??
    // Unknown or legacy values ("auto", "off") fall back to Agent Core ("ask").
    PERMISSION_MODE_OPTIONS.find((option) => option.value === "ask") ??
    PERMISSION_MODE_OPTIONS[0]
  );
}

/** Menu heading. LAiM runs every tool on the host with full rights, so there is nothing else to
 *  pick here. */
export function PermissionMenuLabel() {
  const t = useT();
  return (
    <DropdownMenuLabel className="flex items-center justify-between gap-3">
      <span>{t("settings.general.permissions.sectionTitle")}</span>
    </DropdownMenuLabel>
  );
}

/** The option rows shared by every permission dropdown or submenu. Non-full levels apply
 *  directly; picking Full access must go through the caller's danger confirmation. */
function useAccountPermissionMode() {
  const fullAccessAllowed = useFullAccessAllowed();
  const permissionMode = useChatRuntimeStore((s) => s.permissionMode);
  const setPermissionMode = useChatRuntimeStore((s) => s.setPermissionMode);
  useEffect(() => {
    if (!fullAccessAllowed && permissionMode === "full") setPermissionMode("ask");
  }, [fullAccessAllowed, permissionMode, setPermissionMode]);
  return {
    permissionMode: !fullAccessAllowed && permissionMode === "full" ? "ask" : permissionMode,
    fullAccessAllowed,
  };
}

export function PermissionModeMenuItems({
  onRequestFullAccess,
}: {
  onRequestFullAccess: () => void;
}) {
  const { permissionMode, fullAccessAllowed } = useAccountPermissionMode();
  const setPermissionMode = useChatRuntimeStore((s) => s.setPermissionMode);

  return (
    <>
      {PERMISSION_MODE_OPTIONS.filter((option) => fullAccessAllowed || option.value !== "full").map((option) => (
        <DropdownMenuItem
          key={option.value}
          onSelect={() => {
            if (option.value === permissionMode) return;
            if (option.value === "full") {
              onRequestFullAccess();
            } else {
              setPermissionMode(option.value);
            }
          }}
          className={cn(
            "items-start gap-2 py-2",
            permissionMode === option.value && "font-medium",
          )}
        >
          <option.icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-ui-13 leading-tight">{option.label}</span>
            <span className="text-xs font-normal leading-snug text-muted-foreground">
              {option.description}
            </span>
          </span>
          {permissionMode === option.value ? (
            <HugeiconsIcon
              icon={MenuTickIcon}
              strokeWidth={2}
              // Centred on both lines; sized in index.css.
              className="permission-mode-tick ml-auto size-4 shrink-0 self-center"
            />
          ) : null}
        </DropdownMenuItem>
      ))}
    </>
  );
}

/** The level in effect, for Settings to spell out. */
export function useActivePermissionMode() {
  return permissionModeOption(useAccountPermissionMode().permissionMode);
}

/** The focused element, or for a closing menu its trigger (menus label themselves by it). */
function lastFocusOutsideMenus(): HTMLElement | null {
  let element = document.activeElement;
  for (
    let menu = element?.closest('[role="menu"]');
    menu;
    menu = element?.closest('[role="menu"]')
  ) {
    const triggerId = menu.getAttribute("aria-labelledby");
    element = triggerId ? document.getElementById(triggerId) : null;
  }
  return element instanceof HTMLElement && element !== document.body ? element : null;
}

/** Full access confirmation body, shared by both dialogs that ask for it. */
export function FullAccessConfirmContent({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  const openSettings = useSettingsDialogStore((s) => s.openDialog);
  // Focus before the dialog opened, so Settings can return there and not to a removed button.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  return (
    // Backdrop click cancels; no ring.
    <AlertDialogContent
      className="gap-5 p-7 ring-0 data-[size=default]:sm:max-w-[calc(500px*var(--ui-space-scale,1))]"
      onOverlayClick={onClose}
      // Focus the card, not Cancel, so Cancel shows no focus border until tabbed to.
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        returnFocusRef.current = lastFocusOutsideMenus();
        (event.currentTarget as HTMLElement).focus();
      }}
    >
      <AlertDialogHeader className="gap-2">
        <AlertDialogTitle className="flex items-center gap-2.5">
          <ShieldAlertGlyph className="size-5 shrink-0" strokeWidth={2} />
          {translate("uxChat.turnOnFullAccesszhszm")}
        </AlertDialogTitle>
        {/* text-pretty: balance splits this sentence into two short lines. */}
        <AlertDialogDescription className="text-pretty leading-relaxed">
          {translate("uxChat.toolsWillRunWithout1r1rl")}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <ul className="flex flex-col rounded-2xl bg-muted/50 px-5 py-1.5">
        {FULL_ACCESS_SCOPES.map((scope) => (
          <li key={scope.title} className="flex items-center gap-4 py-3">
            <HugeiconsIcon
              icon={scope.icon}
              strokeWidth={1.75}
              className="size-5 shrink-0 text-muted-foreground"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{scope.title}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {scope.description}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
        {translate("uxChat.risksIncludeDataLossq4bx7", { p1: " " })}
      </p>
      <AlertDialogFooter className="mt-1">
        {/* Muted, not outline: outline keeps a border in light mode. */}
        <AlertDialogCancel variant="muted">
          {translate("common.cancel")}
        </AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={onConfirm}>
          {translate("uxChat.turnOns74tk")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/** Danger confirmation shown before Full access turns on. Self-contained so the dropdown works
 *  outside the chat page (e.g. the Settings dialog). */
export function FullAccessConfirmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setPermissionMode = useChatRuntimeStore((s) => s.setPermissionMode);
  const { fullAccessAllowed } = useAccountPermissionMode();
  if (!fullAccessAllowed) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <FullAccessConfirmContent
        onConfirm={() => {
          setPermissionMode("full");
          onOpenChange(false);
        }}
        onClose={() => onOpenChange(false)}
      />
    </AlertDialog>
  );
}

/** Select-style dropdown (like the MCP composer menu) for picking the permission level. Used in the
 *  chat settings sheet. */
export function PermissionModeDropdown({
  side = "bottom",
  align = "end",
  triggerClassName,
}: {
  side?: "top" | "bottom";
  align?: "start" | "end";
  triggerClassName?: string;
} = {}) {
  const { permissionMode } = useAccountPermissionMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const active = permissionModeOption(permissionMode);
  const ActiveIcon = active.icon;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5", triggerClassName)}
            aria-label={translate("uxChat.permissionLevelForTool18e61")}
          >
            <ActiveIcon className="size-3.5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate text-left">
              {active.label}
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={side}
          align={align}
          className="w-[calc(330px*var(--ui-space-scale,1))]"
          avoidCollisions={true}
        >
          <PermissionMenuLabel />
          <PermissionModeMenuItems
            // Defer past the menu-close focus restoration so the dialog's focus trap is not broken by the
            // dropdown grabbing focus back.
            onRequestFullAccess={() =>
              setTimeout(() => setConfirmOpen(true), 0)
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <FullAccessConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}

/** Composer pill showing the current permission level in the chat box; clicking opens the level
 *  dropdown. The Full access pick routes through the store-driven confirm dialog mounted at the
 *  chat-page root, so the warning survives this menu unmounting. */
export function PermissionModeComposerPill({
  side = "bottom",
}: {
  side?: "top" | "bottom";
} = {}) {
  const { permissionMode, fullAccessAllowed } = useAccountPermissionMode();
  const setBypassConfirmOpen = useChatRuntimeStore(
    (s) => s.setBypassConfirmOpen,
  );
  const active = permissionModeOption(permissionMode);
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <button
          type="button"
          className="composer-pill-btn composer-pill-permissions"
          data-pill-label={active.label}
          aria-label={translate("uxChat.permissionLevelForTool18e61")}
          title={`${active.label}: ${active.description}`}
        >
          <span className="composer-pill-glyph">
            <ActiveIcon className="size-[calc(15px*var(--ui-space-scale,1))]" strokeWidth={2} />
          </span>
          <span>{active.label}</span>
          <HugeiconsIcon
            icon={ChevronDownStandardIcon}
            strokeWidth={1.5}
            className="composer-pill-caret size-[calc(15px*var(--ui-space-scale,1))]"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align="start"
        sideOffset={0}
        avoidCollisions={true}
        className="LAiM-plus-menu w-[calc(330px*var(--ui-space-scale,1))]"
      >
        <PermissionMenuLabel />
        <PermissionModeMenuItems
          // Defer past the menu-close focus restoration (see PermissionModeDropdown).
          onRequestFullAccess={() =>
            setTimeout(() => setBypassConfirmOpen(true), 0)
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
