// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

/**
 * The desktop URL scheme this app registers, as the OS and the `URL` parser see it.
 *
 * `new URL("LAiM://run")` lowercases the scheme to "laim:", so anything comparing a parsed
 * protocol has to compare the lowercase form. The registered name keeps its capitals for the
 * Windows registry and the installer; only comparisons go lowercase.
 */
export const LAiM_SCHEME = "laim";

export const LAiM_PROTOCOL = `${LAiM_SCHEME}:`;

export function isLAiMProtocol(protocol: string): boolean {
  return protocol.toLowerCase() === LAiM_PROTOCOL;
}
