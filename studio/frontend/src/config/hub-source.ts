// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

/**
 * The Hugging Face organization whose models and datasets this build lists,
 * filters and downloads.
 *
 * This is a data source, not branding: the UI keeps showing LAiM everywhere, but
 * the Hub only serves repositories under the organization that actually owns
 * them. Pointing it at an organization that does not exist makes every query
 * return HTTP 200 with an empty list, so the Models tab renders blank rather
 * than raising an error.
 */
export const HF_SOURCE_OWNER = "unsloth";

/** Second first-party org: GGUF/audio.cpp artifacts sit beside the main one. */
const HF_EXTRA_OWNERS = ["unslothai"];

/** Hub repos that belong to this build, so UI can group and rank them as first party. */
export function isHfFirstPartyOwner(owner: string | null | undefined): boolean {
  const normalized = owner?.trim().toLowerCase();
  return normalized !== undefined && [HF_SOURCE_OWNER, ...HF_EXTRA_OWNERS].includes(normalized);
}

/** True for a full repo id ("owner/name") owned by this build. */
export function isHfFirstPartyRepo(id: string): boolean {
  return isHfFirstPartyOwner(id.split("/")[0]);
}

/**
 * Publisher text under a model card. The org name is a Hub identifier, so the card
 * shows the app's own name for it instead of the upstream spelling.
 */
export function displayOwnerLabel(owner: string): string {
  return isHfFirstPartyOwner(owner) ? "laim" : owner;
}
