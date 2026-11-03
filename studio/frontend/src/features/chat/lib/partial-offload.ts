// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { cpuFallbackMessage } from "../utils/mmproj-fallback";

// React-free so node:test can import it; shared by every model load path.

export interface OffloadCounts {
  offloaded?: number | null;
  total?: number | null;
  gpuMemoryMode?: string | null;
  gpuLayers?: number | null;
  /** The user's own `-ngl` in llama-server extras, which Auto mode respects. */
  offloadOverridden?: boolean | null;
  cpuFallbackReason?: string | null;
  gpuBackendUnavailable?: boolean | null;
}

export interface OffloadCountsSource {
  offloaded_layers?: number | null;
  offload_total_layers?: number | null;
  gpu_memory_mode?: string | null;
  gpu_layers?: number | null;
  offload_overridden?: boolean | null;
  cpu_fallback_reason?: string | null;
  gpu_backend_unavailable?: boolean | null;
}

/** Pick the split out of a load response, so the load paths cannot drift. */
export function offloadCountsFrom(
  response: OffloadCountsSource,
): OffloadCounts {
  return {
    offloaded: response.offloaded_layers,
    total: response.offload_total_layers,
    gpuMemoryMode: response.gpu_memory_mode,
    gpuLayers: response.gpu_layers,
    offloadOverridden: response.offload_overridden,
    cpuFallbackReason: response.cpu_fallback_reason,
    gpuBackendUnavailable: response.gpu_backend_unavailable,
  };
}

export interface OffloadWarning {
  /** Appended to the loaded title, e.g. "Qwen3 loaded, partly on CPU". */
  titleSuffix: string;
  description: string;
}

/** Why a loaded model is not fully on the GPU, or `null`. A known cpu_fallback_reason
 * wins over the counts: a recovered Vulkan crash also logs 0/M, and is not a size problem.
 * Manual pins only count with gpuLayers >= 0 (Manual + Auto layers is llama.cpp's fit). */
export function offloadWarning(counts: OffloadCounts): OffloadWarning | null {
  const {
    offloaded,
    total,
    gpuMemoryMode,
    gpuLayers,
    offloadOverridden,
    cpuFallbackReason,
    gpuBackendUnavailable,
  } = counts;
  if (cpuFallbackReason === "vulkan_startup_crash") {
    return {
      titleSuffix: translate("uxChat.onCpuU58fa"),
      description: cpuFallbackMessage(),
    };
  }
  // An unrecognised reason is still a reason: say nothing rather than guess at it.
  if (cpuFallbackReason) return null;
  if (typeof offloaded !== "number" || typeof total !== "number") return null;
  if (total <= 0 || offloaded >= total) return null;
  // Before the pin check: a GPU backend that failed to load is never what was asked for.
  if (offloaded <= 0 && gpuBackendUnavailable && gpuLayers !== 0) {
    return {
      titleSuffix: translate("uxChat.commaOnCpuI24pl"),
      description: translate("uxChat.gpuBackendOnCpuSlowE82jm"),
    };
  }
  const manualPin =
    gpuMemoryMode === "manual" &&
    typeof gpuLayers === "number" &&
    gpuLayers >= 0;
  if (manualPin || offloadOverridden) return null;
  if (offloaded <= 0) {
    return {
      titleSuffix: translate("uxChat.commaOnCpuI24pl"),
      get description() {
        return translate("uxChat.noneOfTheLayerse25q8", { p1: total });
      },
    };
  }
  return {
    titleSuffix: translate("uxChat.commaPartlyOnCpuO91zt"),
    description: translate("uxChat.layersOnGpuRestOnCpuR46nv", {
      p1: offloaded,
      p2: total,
    }),
  };
}
