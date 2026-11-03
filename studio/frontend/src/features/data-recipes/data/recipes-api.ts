// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { authFetch, getAuthSessionEpoch } from "@/features/auth";
import { translate } from "@/i18n";


export const RECIPES_API = "/api/data-recipe/recipes";

export class RecipeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function assertSameSession(epoch: number): void {
  if (getAuthSessionEpoch() !== epoch) {
    throw new Error(translate("uxDatarecipes.signedOutBeforeTheen86l"));
  }
}

export async function recipeRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const epoch = getAuthSessionEpoch();
  const res = await authFetch(
    `${RECIPES_API}${path}`,
    {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    },
    // A write retried after a refresh must not land in an account that signed in meanwhile.
    { beforeRetry: () => assertSameSession(epoch) },
  );
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    throw new RecipeApiError(
      typeof detail === "string" ? detail : translate("uxDatarecipes.requestFailedb9a7f", { p1: res.status }),
      res.status,
    );
  }
  return body as T;
}
