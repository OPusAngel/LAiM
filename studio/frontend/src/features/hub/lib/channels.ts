// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { HfSortKey } from "@/features/hub/hooks/use-hub-model-search";
import { HF_SOURCE_OWNER } from "@/config/hub-source";
import {
  NewReleasesIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { ModelFormatFilter } from "../types";

export type ChannelId =
  | "LAiM-trending"
  | "LAiM-latest"
  | "LAiM-safetensors";

export interface ChannelPreset {
  id: ChannelId;
  label: string;
  icon: IconSvgElement;
  hint: string;
  owner?: string;
  tags?: readonly string[];
  query?: string;
  idSuffix?: string;
  format: ModelFormatFilter;
  sort: HfSortKey;
  // Keep only formats LAiM can fine-tune (drops fp8, nvfp4, w4a16, etc.).
  finetunableOnly?: boolean;
}

export const CHANNEL_PRESETS: readonly ChannelPreset[] = [
  {
    id: "LAiM-trending",
    get label() { return translate("uxHub.lAiMTrendingq99tr"); },
    icon: SparklesIcon,
    get hint() {
      return translate("uxHub.mostTrendingModelsPublished6r9i8");
    },
    owner: HF_SOURCE_OWNER,
    tags: ["gguf"],
    format: "recommended",
    sort: "trendingScore",
  },
  {
    id: "LAiM-latest",
    get label() {
      return translate("uxHub.latestLAiM14o7h");
    },
    icon: NewReleasesIcon,
    get hint() {
      return translate("uxHub.freshlyReleasedModelsFrom1nozq");
    },
    owner: HF_SOURCE_OWNER,
    format: "all",
    // Trending weighed against release age (lib/fresh-ranking.ts).
    sort: "fresh",
  },
  {
    id: "LAiM-safetensors",
    get label() {
      return translate("uxHub.fineTuneReady15m77");
    },
    icon: SlidersHorizontalIcon,
    get hint() {
      return translate("uxHub.checkpointsReadyToFine1ngg2");
    },
    owner: HF_SOURCE_OWNER,
    format: "checkpoint",
    sort: "lastModified",
    finetunableOnly: true,
  },
];

export function findChannel(id: ChannelId | null): ChannelPreset | null {
  if (!id) return null;
  return CHANNEL_PRESETS.find((preset) => preset.id === id) ?? null;
}

export type HubSection = "trending" | "latest" | "finetune";

export const SECTION_TO_CHANNEL: Record<HubSection, ChannelId> = {
  trending: "LAiM-trending",
  latest: "LAiM-latest",
  finetune: "LAiM-safetensors",
};

export const CHANNEL_TO_SECTION: Record<ChannelId, HubSection> = {
  "LAiM-trending": "trending",
  "LAiM-latest": "latest",
  "LAiM-safetensors": "finetune",
};

export const HUB_SECTION_TITLE: Record<HubSection, string> = {
  get trending() { return translate("uxHub.trendingNowphyl6"); },
  get latest() { return translate("uxHub.latestLAiMModelsip1tw"); },
  get finetune() { return translate("uxHub.fineTuneReady1tzhp"); },
};
