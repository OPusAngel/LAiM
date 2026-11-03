// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import {
  CloudOffIcon,
  CubeIcon,
  FilterIcon,
  Refresh01Icon,
  WifiDisconnected02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { useUiSpaceScale } from "@/hooks/use-ui-space-scale";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useHubAvailability } from "../hooks/use-online-status";
import {
  clearRemoteBackoff,
  hubAuthFailure,
  type HubFailure,
} from "../lib/network";
import { useIsAccountOwner } from "@/features/auth";
import { updateHubSource, useSettingsDialogStore } from "@/features/settings";
import { translate, useT } from "@/i18n";
import { useHubName, useHubSource } from "@/lib/hf-endpoint";

// Only a browser reporting itself offline earns "You're offline". Calling a DNS
// filter or extension block "offline" is what made these bugs undiagnosable.
function describeFailure(
  failure: HubFailure | null | undefined,
  online: boolean,
  resourceLabel: "models" | "datasets",
  hub: string,
  offersModelScope: boolean,
): {
  title: string;
  body: string;
  offlineLike: boolean;
  tokenRejected?: boolean;
} {
  switch (failure?.kind) {
    case "browser-offline":
      return {
        title: translate("picker.offlineTitle"),
        get body() { return translate("uxHub.reconnectToTheInternettvzti", { p1: resourceLabel, p2: hub }); },
        offlineLike: true,
      };
    case "timeout":
      return {
        get title() { return translate("uxHub.timedOutnnwdv", { p1: hub }); },
        body: failure.message,
        offlineLike: false,
      };
    case "network-opaque":
    case "unknown":
      return {
        get title() { return translate("uxHub.canTReachw9ar1", { p1: hub }); },
        body:
          failure.kind === "network-opaque" && offersModelScope
            ? translate("uxHub.unableToReachCheckw6w18", { p1: hub })
            : failure.message,
        offlineLike: false,
      };
    // Reached and refused: the fix is the token, not the connection or the hub.
    case "auth-rejected":
      return {
        get title() { return translate("uxHub.rejectedYourTokenw8bdk", { p1: hub }); },
        body: failure.message,
        offlineLike: false,
        tokenRejected: true,
      };
    default:
      break;
  }
  return online
    ? {
        get title() { return translate("uxHub.couldnTReachxj74s", { p1: hub }); },
        get body() { return translate("uxHub.theDiscoveryFeedCouldn91ohl"); },
        offlineLike: false,
      }
    : {
        get title() { return translate("uxHub.canTReachw9ar1", { p1: hub }); },
        get body() { return translate("uxHub.lAiMCouldnTLoadcmix1", { p1: resourceLabel, p2: hub }); },
        offlineLike: false,
      };
}

function useOffersModelScope(): boolean {
  const isOwner = useIsAccountOwner();
  const source = useHubSource();
  return isOwner && source === "huggingface";
}

function UseModelScopeButton() {
  const t = useT();
  const offersModelScope = useOffersModelScope();
  const [switching, setSwitching] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!offersModelScope) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        disabled={switching}
        title={t("picker.useModelScopeHint")}
        onClick={() => {
          setSwitching(true);
          setFailed(false);
          updateHubSource("modelscope")
            .catch(() => setFailed(true))
            .finally(() => setSwitching(false));
        }}
        className="h-8 rounded-full"
      >
        {t("picker.useModelScope")}
      </Button>
      {failed ? (
        <span className="text-ui-11 text-destructive">
          {t("picker.useModelScopeFailed")}
        </span>
      ) : null}
    </span>
  );
}

function UpdateTokenButton() {
  const t = useT();
  const openSettings = useSettingsDialogStore((s) => s.openDialog);
  return (
    <Button
      size="sm"
      onClick={() => openSettings("general")}
      className="h-8 rounded-full"
    >
      {t("picker.updateToken")}
    </Button>
  );
}

export function NetworkErrorState({
  online,
  message,
  failure,
  onRetry,
  onSwitchDevice,
  resourceLabel = "models",
}: {
  online: boolean;
  message: string;
  failure?: HubFailure | null;
  onRetry: () => void;
  onSwitchDevice?: () => void;
  resourceLabel?: "models" | "datasets";
}) {
  // An SDK error the network layer never saw (the Hub answered 401) carries only
  // its text, so the refusal is recovered from it rather than called unreachable.
  const shown = failure ?? hubAuthFailure({ message });
  const { title, body, offlineLike, tokenRejected } = describeFailure(
    shown,
    online,
    resourceLabel,
    useHubName(),
    useOffersModelScope(),
  );
  const icon = offlineLike ? WifiDisconnected02Icon : CloudOffIcon;

  return (
    <div className="flex min-h-[calc(260px*var(--ui-space-scale,1))] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="inline-flex size-11 items-center justify-center rounded-[12px] bg-amber-500/10 text-amber-700 dark:text-amber-300">
        <HugeiconsIcon icon={icon} strokeWidth={1.6} className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-ui-14 font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="max-w-md text-ui-12p5 leading-5 text-muted-foreground">
          {body}
        </p>
        {tokenRejected ? null : (
          <p className="text-ui-11 text-muted-foreground/70">{message}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tokenRejected ? <UpdateTokenButton /> : null}
        {/* A reachable hub answering an HTTP error is no reason to switch hubs. */}
        {shown && !offlineLike && !tokenRejected ? <UseModelScopeButton /> : null}
        {onSwitchDevice ? (
          <button
            type="button"
            onClick={onSwitchDevice}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--foreground)_calc(6%*var(--contrast-wash-gain,1)),transparent)] px-3 text-ui-12 font-medium text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_calc(10%*var(--contrast-wash-gain,1)),transparent)] dark:bg-[rgb(249_226_222_/_calc(0.06*var(--contrast-wash-gain,1)))] dark:hover:bg-[rgb(249_226_222_/_calc(0.1*var(--contrast-wash-gain,1)))]"
          >{translate("uxHub.onDevicetz33l")}</button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-transparent px-3 text-ui-12 font-medium text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_calc(4%*var(--contrast-wash-gain,1)),transparent)] dark:hover:bg-[rgb(249_226_222_/_calc(0.05*var(--contrast-wash-gain,1)))]"
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            strokeWidth={1.75}
            className="size-3.5"
          />
          {translate("browser.error.retry")}
        </button>
      </div>
    </div>
  );
}

export function HubFailureHint({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  const { phase, failure: availabilityFailure } = useHubAvailability();
  const failure = availabilityFailure ?? hubAuthFailure({ message });
  const { title, body, offlineLike, tokenRejected } = describeFailure(
    failure,
    phase === "available",
    "models",
    useHubName(),
    useOffersModelScope(),
  );
  return (
    <div className="flex flex-col gap-2 px-2.5 py-2">
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
        {/* A classified failure already names the cause; an HTTP error only has its message. */}
        {failure || !message ? null : (
          <p className="text-xs text-muted-foreground/70">{message}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tokenRejected ? <UpdateTokenButton /> : null}
        {failure && !offlineLike && !tokenRejected ? <UseModelScopeButton /> : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearRemoteBackoff();
            onRetry();
          }}
          className="h-8 rounded-full"
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            strokeWidth={1.75}
            className="size-3.5"
          />
          {translate("browser.error.retry")}
        </Button>
      </div>
    </div>
  );
}

export function DiscoverFetchMoreState({
  scannedCount,
  hasActiveFilters,
  isLoadingMore,
  onFetchMore,
  onClearFilters,
}: {
  scannedCount: number;
  hasActiveFilters: boolean;
  isLoadingMore: boolean;
  onFetchMore: () => void;
  onClearFilters: () => void;
}) {
  const hubName = useHubName();
  return (
    <div className="flex min-h-[calc(260px*var(--ui-space-scale,1))] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="inline-flex size-11 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
        <HugeiconsIcon icon={FilterIcon} strokeWidth={1.5} className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-ui-14 font-semibold tracking-tight text-foreground">
          {translate("uxHub.noMatchesYet1urr9")}
        </p>
        <p className="max-w-md text-ui-12p5 leading-5 text-muted-foreground">{translate("uxHub.scannedResultsLoadAnother6aeqz", { p1: scannedCount.toLocaleString(), p2: hubName })}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--foreground)_calc(6%*var(--contrast-wash-gain,1)),transparent)] px-3 text-ui-12 font-medium text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_calc(10%*var(--contrast-wash-gain,1)),transparent)] dark:bg-[rgb(249_226_222_/_calc(0.06*var(--contrast-wash-gain,1)))] dark:hover:bg-[rgb(249_226_222_/_calc(0.1*var(--contrast-wash-gain,1)))]"
          >{translate("uxHub.clearFiltersylqcn")}</button>
        )}
        <button
          type="button"
          onClick={onFetchMore}
          disabled={isLoadingMore}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-transparent px-3 text-ui-12 font-medium text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_calc(4%*var(--contrast-wash-gain,1)),transparent)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[rgb(249_226_222_/_calc(0.05*var(--contrast-wash-gain,1)))]"
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            strokeWidth={1.75}
            className="size-3.5"
          />
          {isLoadingMore ? "Loading..." : translate("uxHub.loadMore979qc")}
        </button>
      </div>
    </div>
  );
}

export function DiscoverFetchMoreFooter({
  hasActiveFilters,
  isLoadingMore,
  onFetchMore,
  failed = false,
  failureText,
  onRetry,
}: {
  hasActiveFilters: boolean;
  isLoadingMore: boolean;
  onFetchMore: () => void;
  /** The last attempt failed, so this is the only recovery left on screen. */
  failed?: boolean;
  /** The classified, already sanitized cause. Shown here because this footer
   *  outlives the toast that would otherwise be the only place it appeared. */
  failureText?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2 rounded-[16px] bg-card px-4 py-4 text-center">
      {/* Only warn about hidden results when a filter is actually narrowing them. */}
      {hasActiveFilters && (
        <p className="text-ui-11p5 leading-4 text-muted-foreground">
          {translate("uxHub.someResultsMayBeho04x")}
        </p>
      )}
      {/* Rows stay on screen when the feed fails, so without this the outage is
          invisible and there is nothing left to click once the toast goes. The
          cause goes here too: naming it is the whole point, and the toast is
          transient, so reducing this to "out of date" threw it away again. */}
      {failed && (
        <p className="max-w-md text-ui-11p5 leading-4 text-muted-foreground">
          {failureText || translate("uxHub.theseResultsMayBeumvnq")}
        </p>
      )}
      <button
        type="button"
        onClick={failed && onRetry ? onRetry : onFetchMore}
        disabled={isLoadingMore}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--foreground)_calc(6%*var(--contrast-wash-gain,1)),transparent)] px-3 text-ui-12 font-medium text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_calc(10%*var(--contrast-wash-gain,1)),transparent)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[rgb(249_226_222_/_calc(0.06*var(--contrast-wash-gain,1)))] dark:hover:bg-[rgb(249_226_222_/_calc(0.1*var(--contrast-wash-gain,1)))]"
      >
        <HugeiconsIcon
          icon={Refresh01Icon}
          strokeWidth={1.75}
          className="size-3.5"
        />
        {isLoadingMore ? "Loading..." : failed ? translate("uxHub.tryAgainxb90s") : translate("uxHub.loadMore979qc")}
      </button>
    </div>
  );
}

export function InventoryErrorState({
  isDataset,
  onRetry,
}: {
  isDataset: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[calc(260px*var(--ui-space-scale,1))] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="inline-flex size-11 items-center justify-center rounded-[12px] bg-amber-500/10 text-amber-700 dark:text-amber-300">
        <HugeiconsIcon icon={CloudOffIcon} strokeWidth={1.6} className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-ui-14 font-semibold tracking-tight text-foreground">
          {translate("uxHub.couldnTLoadYour1yeh4")}
        </p>
        <p className="max-w-md text-ui-12p5 leading-5 text-muted-foreground">{translate("uxHub.somethingWentWrongReadingskf8a", { p1: " ", p2: isDataset ? "datasets" : "models" })}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-transparent px-3 text-ui-12 font-medium text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_calc(4%*var(--contrast-wash-gain,1)),transparent)] dark:hover:bg-[rgb(249_226_222_/_calc(0.05*var(--contrast-wash-gain,1)))]"
      >
        <HugeiconsIcon icon={Refresh01Icon} strokeWidth={1.75} className="size-3.5" />
        {translate("browser.error.retry")}
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon = CubeIcon,
  action,
}: {
  title: string;
  body: string;
  icon?: IconSvgElement;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(220px*var(--ui-space-scale,1))] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="inline-flex size-11 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-ui-14 font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="max-w-md text-ui-12p5 leading-5 text-muted-foreground">
          {body}
        </p>
      </div>
      {action}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="size-8 shrink-0 animate-pulse rounded-[9px] bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-[calc(13px*var(--ui-space-scale,1))] w-1/2 animate-pulse rounded-full bg-muted" />
        <div className="h-[calc(11px*var(--ui-space-scale,1))] w-3/4 animate-pulse rounded-full bg-muted/70" />
      </div>
    </div>
  );
}

const SKELETON_ROW_ESTIMATE_PX = 56;
const MIN_SKELETON_ROWS = 4;
const MAX_SKELETON_ROWS = 24;
const DEFAULT_SKELETON_ROWS = 6;

// The row's padding, avatar and bars follow the UI font size, so the estimate
// does too, or the list under-fills at small sizes and overflows at large.
function clampSkeletonCount(height: number, scale: number): number {
  if (!Number.isFinite(height) || height <= 0) return DEFAULT_SKELETON_ROWS;
  const rowHeight = SKELETON_ROW_ESTIMATE_PX * scale;
  return Math.max(
    MIN_SKELETON_ROWS,
    Math.min(MAX_SKELETON_ROWS, Math.ceil(height / rowHeight)),
  );
}

export function SkeletonList({ count }: { count?: number }) {
  const ref = useRef<HTMLUListElement>(null);
  const [autoCount, setAutoCount] = useState(count ?? DEFAULT_SKELETON_ROWS);
  const rowCount = count ?? autoCount;
  const scale = useUiSpaceScale();

  useLayoutEffect(() => {
    if (count != null) return;
    const container = ref.current?.parentElement;
    if (!container || typeof window === "undefined") return;

    let frame: number | null = null;
    const update = () => {
      frame = null;
      setAutoCount(clampSkeletonCount(container.clientHeight, scale));
    };
    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(update);
    };
    schedule();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", schedule);
      return () => {
        if (frame !== null) window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", schedule);
      };
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [count, scale]);

  return (
    <ul ref={ref} className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rowCount }).map((_, i) => (
        <li key={i}>
          <SkeletonRow />
        </li>
      ))}
    </ul>
  );
}

