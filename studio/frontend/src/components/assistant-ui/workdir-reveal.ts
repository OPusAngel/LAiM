// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { authFetch } from "@/features/auth";

import { workdirRoutePrefix } from "./workdir-files";
import { translate } from "@/i18n";


/** Route that opens a session's workdir in the OS file manager. */
export function workdirRevealPath(sessionId: string): string {
  const { prefix, query } = workdirRoutePrefix(sessionId);
  return `${prefix}/reveal${query}`;
}

/**
 * Whether this session's workdir holds anything, to tell a candidate folder
 * apart from one never written to. A missing workdir already lists as an empty
 * array, so a non-OK is something else and is thrown: swallowing it would send
 * the caller to its fallback and silently open a different workspace.
 */
export async function workdirHasFiles(sessionId: string): Promise<boolean> {
  const { prefix, query } = workdirRoutePrefix(sessionId);
  const response = await authFetch(`${prefix}${query}`);
  if (!response.ok) {
    throw new Error(translate("uxComponents.couldNotReadThe425t1", { p1: response.status }));
  }
  const body: unknown = await response.json();
  const files = (body as { files?: unknown } | null)?.files;
  return Array.isArray(files) && files.length > 0;
}

/**
 * Open a chat's workdir folder in the OS file manager.
 *
 * The backend does the opening, so the folder lands on the user's own desktop
 * only when the backend runs there. Callers gate this on the desktop app.
 */
export async function revealWorkdir(sessionId: string): Promise<void> {
  const response = await authFetch(workdirRevealPath(sessionId), {
    method: "POST",
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "detail" in body) {
        const value = (body as { detail?: unknown }).detail;
        if (typeof value === "string") detail = value;
      }
    } catch {
      // A non-JSON error body leaves the status as the only thing to report.
    }
    // Status lets callers tell "no folder yet" (404) from a failure.
    throw Object.assign(new Error(detail || `Request failed (${response.status})`), {
      status: response.status,
    });
  }
}
