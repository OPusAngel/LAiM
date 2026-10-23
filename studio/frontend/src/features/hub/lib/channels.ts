// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { HfSortKey } from "@/features/hub/hooks/use-hub-model-search";
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
    label: "LAiM Trending",
    icon: SparklesIcon,
    hint: "Most trending models published by LAiM.",
    owner: "LAiM",
    tags: ["gguf"],
    format: "recommended",
    sort: "trendingScore",
  },
  {
    id: "LAiM-latest",
    label: "Latest LAiM",
    icon: NewReleasesIcon,
    hint: "Freshly released models from the LAiM channel.",
    owner: "LAiM",
    format: "all",
    // Trending weighed against release age (lib/fresh-ranking.ts).
    sort: "fresh",
  },
  {
    id: "LAiM-safetensors",
    label: "Fine-tune ready",
    icon: SlidersHorizontalIcon,
    hint: "Checkpoints ready to fine-tune.",
    owner: "LAiM",
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
  trending: "Trending Now",
  latest: "Latest LAiM Models",
  finetune: "Fine-tune Ready",
};
