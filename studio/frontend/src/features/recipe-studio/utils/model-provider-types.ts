// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";

export const MODEL_PROVIDER_TYPE_OPTIONS = [
  { value: "openai", get label() { return translate("uxRecipestudio.openAICompatible9rppy"); } },
  { value: "anthropic", label: "Anthropic" },
] as const;

export const SUPPORTED_MODEL_PROVIDER_TYPES = MODEL_PROVIDER_TYPE_OPTIONS.map(
  (option) => option.value,
);

export function normalizeModelProviderType(value: string): string {
  return value.trim().toLowerCase();
}

export function isSupportedModelProviderType(value: string): boolean {
  const normalized = normalizeModelProviderType(value);
  return SUPPORTED_MODEL_PROVIDER_TYPES.some((type) => type === normalized);
}
