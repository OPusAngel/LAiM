// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";

const MLX_DRAFTER_LABELS: Record<string, string> = {
  mtp: "MTP",
  dflash: "DFlash",
  dspark: "DSpark",
  eagle3: "EAGLE-3",
};

/** Copy for an MLX load's spec_fallback_reason, or null for a code MLX does not report. Several
 *  backend paths share each code, so the copy states only what every one of them implies, and the
 *  outcome follows what runs: the reason can name a drafter passed over while another attached. */
export function mlxSpecFallbackMessage(
  reason: string,
  drafterKind: string | null,
): string | null {
  const outcome =
    drafterKind == null
      ? "so it is running without speculative decoding"
      : drafterKind === "ngram"
        ? "so it is drafting with n-gram copies only"
        : `so it is drafting with ${MLX_DRAFTER_LABELS[drafterKind] ?? drafterKind} instead`;
  switch (reason) {
    case "drafter_not_found":
      return translate("uxChat.aDrafterThisLoadmbe8e", { p1: outcome });
    case "drafter_incompatible":
      return translate("uxChat.aDrafterWasFound5ebu6", { p1: outcome });
    case "drafter_no_memory":
      return translate("uxChat.theDrafterCouldNotf0ddb", { p1: outcome });
    case "runtime_error":
      return translate("uxChat.speculativeDecodingCouldNotpingx", { p1: outcome });
    case "kv_quant":
      return translate("uxChat.speculativeDecodingCannotRun782y0");
    case "auto_context_cost":
      return translate("uxChat.autoLeftOutAhwksx", { p1: outcome });
    default:
      return null;
  }
}
