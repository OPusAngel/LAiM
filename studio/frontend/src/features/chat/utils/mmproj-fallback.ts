// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { CpuFallbackReason, MmprojFallbackReason } from "../types/api";
import { translate } from "@/i18n";


/** Said when the whole model, not just the projector, ended up on the CPU. Here rather than
 *  duplicated in chat-adapter.ts and use-chat-model-runtime.ts, so the two load paths cannot
 *  describe the same condition differently. */
export function cpuFallbackMessage(): string {
  return translate("uxChat.vulkanCrashedGpuDisabledM73cx");
}

const MMPROJ_FALLBACK_MESSAGES: Record<MmprojFallbackReason, string> = {
  // Three routes reach this one placement: the fit estimate predicting the projector will not fit
  // in VRAM, a GPU allocation failure at startup, and a bare signal crash with no non-projector
  // diagnostic. So the message names the outcome and no cause. "Could not start on the GPU" is
  // untrue of the predicted route, and "does not fit in VRAM" is worse than vague for the crash
  // routes, since it sends someone with a broken GPU runtime off to cut context.
  get cpu_offload() { return translate("uxChat.lAiMIsRunningThethz0q"); },
  get projector_incompatible() { return translate("uxChat.theVisionProjectorIsol428"); },
  get projector_startup_failure() { return translate("uxChat.theVisionProjectorCouldjj2t1"); },
};

export function isTextOnlyMmprojFallback(
  reason: MmprojFallbackReason | null | undefined,
): boolean {
  return (
    reason === "projector_incompatible" ||
    reason === "projector_startup_failure"
  );
}

export function mmprojFallbackMessage(reason: MmprojFallbackReason): string {
  return MMPROJ_FALLBACK_MESSAGES[reason];
}

export function mmprojLoadNotice(
  modelName: string,
  reason: MmprojFallbackReason,
): { title: string; description: string } {
  return {
    title:
      reason === "cpu_offload"
        ? translate("uxChat.loadedWithVisionOnCpuT25bg", { p1: modelName })
        : translate("uxChat.loadedWithoutVisionD91ys", { p1: modelName }),
    description: mmprojFallbackMessage(reason),
  };
}

/** The one description of how a load was degraded, covering BOTH fallbacks. The two load paths
 *  each wrote this inline as `mmproj ? a : cpu ? b : undefined`, which silently drops the CPU
 *  message whenever both are set. That combination is not hypothetical: on a CPU-fallback replay
 *  llama_cpp.py preserves `_cpu_fallback_reason` and clears `_mmproj_fallback_reason`, so a
 *  low-VRAM machine whose Vulkan backend crashed hits both, and the user was told "loaded
 *  without vision" and never that the model was on the CPU. `baseTitle` is suffixed rather than
 *  replaced because the two callers name models differently. */
export function loadFallbackNotice(
  baseTitle: string,
  cpuFallbackReason: CpuFallbackReason | null | undefined,
  mmprojFallbackReason: MmprojFallbackReason | null | undefined,
  offloadNotice?: { titleSuffix: string; description: string } | null,
): { title: string; description: string | undefined; degraded: boolean } {
  const textOnly = isTextOnlyMmprojFallback(mmprojFallbackReason);
  // A known CPU fallback already explains where the layers went.
  const offload = cpuFallbackReason ? null : (offloadNotice ?? null);

  // When the whole model is on the CPU, saying the projector is too adds nothing. Losing vision
  // entirely is a different fact and is always said.
  let suffix = "";
  if (cpuFallbackReason && textOnly) {
    suffix = translate("uxChat.onCpuWithoutVisionF38hn");
  } else if (cpuFallbackReason) {
    suffix = translate("uxChat.onCpuU58fa");
  } else if (offload) {
    suffix = textOnly
      ? translate("uxChat.commaWithoutVisionS57dk", { p1: offload.titleSuffix })
      : offload.titleSuffix;
  } else if (mmprojFallbackReason === "cpu_offload") {
    suffix = translate("uxChat.withVisionOnCpuJ62wp");
  } else if (textOnly) {
    suffix = translate("uxChat.withoutVisionQ84lz");
  }

  // Both sentences, CPU first: it is the broader condition, and the projector sentence reads as a detail under it.
  const parts: string[] = [];
  if (cpuFallbackReason) {
    parts.push(cpuFallbackMessage());
  }
  if (offload) {
    parts.push(offload.description);
  }
  if (mmprojFallbackReason) {
    parts.push(mmprojFallbackMessage(mmprojFallbackReason));
  }

  return {
    title: `${baseTitle}${suffix}`,
    description: parts.length > 0 ? parts.join(" ") : undefined,
    degraded: Boolean(cpuFallbackReason || offload || mmprojFallbackReason),
  };
}
