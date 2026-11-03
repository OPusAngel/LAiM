// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// its own plain module so the node suite can drive it: the component is JSX the runner cannot import
// Wording and number grouping arrive through `view`, so this stays free of the locale store.

import type { InterpolationValues, TranslationKey } from "@/i18n";

export type ContextUsageBarView = {
  t: (key: TranslationKey, values?: InterpolationValues) => string;
  locale: string;
};

export const formatTokenCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

export const formatTokenCountFull = (
  n: number,
  locale: string,
): string => {
  return n.toLocaleString(locale);
};

export type ContextUsageBarInput = {
  // null when nothing has been counted yet
  used?: number | null;
  // null on external providers, whose context window is unknown
  total?: number | null;
  cached?: number;
  // anthropic-only (billed at the write premium)
  cacheWrites?: number;
  compactionCount?: number;
  promptTokens?: number;
  completionTokens?: number;
  // MLX keeps generating past the window instead of stopping there, so it needs the
  // opposite advice from llama.cpp once a conversation outgrows the limit.
  isMlx?: boolean;
  contextUnboundedWhenBatched?: boolean;
  parallelSlots?: number | null;
  /** context_length_enforced as the load reported it; null where it does not answer. */
  contextEnforced?: boolean | null;
  contextBudget?: number | null;
  estimated?: boolean;
};

/**
 * Which limit warning the tooltip carries, if any.
 *
 * llama.cpp stops generating at the window, so its advice is to raise the limit before
 * hitting it. MLX generates straight past instead, so the same wording would promise a
 * stop that never comes -- and once a conversation is over the window there is something
 * different to say about it. Read from the unclamped ratio: the reported percent caps at
 * 100%, which is exactly the state being reported on.
 */
export type ContextLimitAdvice =
  | "none"
  | "stops-at-limit"
  | "mlx-near-limit"
  | "mlx-past-limit"
  | "mlx-refuses-past-limit"
  | "unenforced-limit";

function contextLimitAdvice(
  used: number,
  total: number,
  isMlx: boolean | undefined,
  enforced: boolean | null | undefined,
  unboundedWhenBatched: boolean | undefined,
  slots: number | null | undefined,
  budget: number | null | undefined,
): ContextLimitAdvice {
  if ((used / total) * 100 <= 85) return "none";
  // Budget wins over contextEnforced: the cache is unbounded but requests are refused.
  if (budget) return "mlx-refuses-past-limit";
  // A window the backend confirmed does not bound the cache is not a limit at all:
  // nothing rotates and nothing stops, so neither of the other two is true of it. An
  // unjudged MLX window says the same thing operationally: the probe could not build a
  // cache, so none was bounded and it grows exactly as a confirmed false one does.
  if (
    enforced === false ||
    (isMlx && enforced == null) ||
    (unboundedWhenBatched && (slots ?? 1) > 1)
  ) {
    return "unenforced-limit";
  }
  if (!isMlx) return "stops-at-limit";
  return used > total ? "mlx-past-limit" : "mlx-near-limit";
}

export type ContextUsageBarState = {
  face: string;
  // shown instead of the ring when the header is too narrow for the face; null shows the ring
  compactFace: string | null;
  label: string;
  totalRowName: string;
  totalRowValue: string;
  // null whenever no ratio can be stated, which also withholds the fill and the 85% warning
  percent: number | null;
  // whether any per-turn row renders, so the tooltip rule never floats above nothing
  hasUsageDetails: boolean;
  advice: ContextLimitAdvice;
};

// a counted zero and an uncounted chat differ: an unmeasured prompt must not read as 0% of the window
export function deriveContextUsageBar(
  {
    used,
    total,
    cached,
    cacheWrites,
    promptTokens,
    completionTokens,
    isMlx,
    contextEnforced,
    contextUnboundedWhenBatched,
    parallelSlots,
    contextBudget,
    estimated,
  }: ContextUsageBarInput,
  view: ContextUsageBarView,
): ContextUsageBarState | null {
  const { t, locale } = view;
  const limit = typeof total === "number" && total > 0 ? total : null;
  const usedTokens =
    typeof used === "number" && Number.isFinite(used) ? used : null;

  // no per-turn rows and no limit advice: neither is known from a guess
  if (estimated && usedTokens !== null && usedTokens > 0) {
    const approx = `~${formatTokenCount(usedTokens)}`;
    const approxFull = `~${formatTokenCountFull(usedTokens, locale)}`;
    if (limit === null) {
      return {
        face: t("uxContext.tokensFace", { count: approx }),
        compactFace: approx,
        label: t("uxContext.labelEstimatedTokens", { approx }),
        totalRowName: t("uxContext.rowEstimatedTokens"),
        totalRowValue: approxFull,
        percent: null,
        hasUsageDetails: false,
        advice: "none",
      };
    }
    return {
      face: `${approx} / ${formatTokenCount(limit)}`,
      compactFace: null,
      label: t("uxContext.labelEstimatedOfTokens", {
        approx,
        total: formatTokenCount(limit),
      }),
      totalRowName: t("uxContext.rowEstimatedTotal"),
      totalRowValue: `${approxFull} / ${formatTokenCountFull(limit, locale)}`,
      percent: Math.min((usedTokens / limit) * 100, 100),
      hasUsageDetails: false,
      advice: "none",
    };
  }
  const hasUsageDetails =
    promptTokens !== undefined ||
    completionTokens !== undefined ||
    (cached !== undefined && cached > 0) ||
    (cacheWrites !== undefined && cacheWrites > 0);

  if (limit === null) {
    // nothing to show: no window to name, and no counted usage to report against one
    if (usedTokens === null) return null;
    if (usedTokens <= 0 && !hasUsageDetails) return null;
    const count = formatTokenCount(usedTokens);
    return {
      face: t("uxContext.tokensFace", { count }),
      compactFace: count,
      label: t("uxContext.labelTokenUsage", { count }),
      totalRowName: t("uxContext.rowTotalTokens"),
      totalRowValue: formatTokenCountFull(usedTokens, locale),
      percent: null,
      hasUsageDetails,
      advice: "none",
    };
  }

  if (usedTokens === null) {
    const count = formatTokenCount(limit);
    return {
      face: `— / ${count}`,
      compactFace: null,
      label: t("uxContext.labelContextWindow", { count }),
      totalRowName: t("uxContext.rowContextWindow"),
      totalRowValue: formatTokenCountFull(limit, locale),
      percent: null,
      hasUsageDetails,
      advice: "none",
    };
  }

  const percent = Math.min((usedTokens / limit) * 100, 100);
  return {
    face: `${formatTokenCount(usedTokens)} / ${formatTokenCount(limit)}`,
    compactFace: null,
    label: t("uxContext.labelContextUsage", {
      used: formatTokenCount(usedTokens),
      total: formatTokenCount(limit),
    }),
    totalRowName: t("uxContext.rowTotal"),
    totalRowValue: `${formatTokenCountFull(usedTokens, locale)} / ${formatTokenCountFull(limit, locale)}`,
    percent,
    hasUsageDetails,
    advice: contextLimitAdvice(
      usedTokens,
      limit,
      isMlx,
      contextEnforced,
      contextUnboundedWhenBatched,
      parallelSlots,
      contextBudget,
    ),
  };
}
