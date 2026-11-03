// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

/**
 * Copy for a scan folder the backend could not read.
 *
 * A folder LAiM is denied looks exactly like an empty one in the model list,
 * so the row has to say which it is and where to fix it.
 */

import { translate } from "@/i18n";

export type ScanFolderStatus =
  | "ok"
  | "permission_denied"
  | "missing"
  | "unreadable"
  | "partial";

export interface ScanFolderStatusCopy {
  title: string;
  hint: string;
}

/** Rough host detection: only picks which settings screen to name. */
function hostPlatform(userAgent: string): "mac" | "windows" | "other" {
  if (/Mac|iPhone|iPad/i.test(userAgent)) return "mac";
  if (/Win/i.test(userAgent)) return "windows";
  return "other";
}

function permissionHint(userAgent: string): string {
  switch (hostPlatform(userAgent)) {
    case "mac":
      return "Grant access in System Settings > Privacy & Security > Files and Folders, then reopen this dialog.";
    case "windows":
      return translate("uxHub.checkTheFolderS12nib");
    default:
      return translate("uxHub.checkTheFolderSoq6rg");
  }
}

export function scanFolderStatusCopy(
  status: ScanFolderStatus | undefined,
  userAgent: string = typeof navigator === "undefined" ? "" : navigator.userAgent,
): ScanFolderStatusCopy | null {
  switch (status) {
    case "permission_denied":
      return {
        get title() { return translate("uxHub.lAiMIsNotAllowednhw5w"); },
        hint: permissionHint(userAgent),
      };
    case "partial":
      return {
        get title() { return translate("uxHub.someModelsInThissqthg"); },
        hint: permissionHint(userAgent),
      };
    case "missing":
      return {
        get title() { return translate("uxHub.thisFolderIsNok7yu0"); },
        get hint() { return translate("uxHub.itWasMovedRenamedv5b99"); },
      };
    case "unreadable":
      return {
        get title() { return translate("uxHub.thisFolderCouldNotnsk6b"); },
        get hint() { return translate("uxHub.theDriveMayBebeg99"); },
      };
    default:
      return null;
  }
}
