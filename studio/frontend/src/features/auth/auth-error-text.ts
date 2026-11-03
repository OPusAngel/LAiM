// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate, type TranslationKey } from "@/i18n";

/** The auth endpoints answer with English `detail` bodies, and two of them carry a recovery shell
 *  command that has to reach the user verbatim. Those bodies are re-rendered here from their exact
 *  backend text, with the command passed through as a placeholder, so nothing sent to or compared
 *  against the API changes. */
const EXACT_DETAIL_KEYS: Record<string, TranslationKey> = {
  "User session is invalid": "uxFeatures.userSessionIsInvalidiyr9d",
  "Current password is incorrect": "uxFeatures.currentPasswordIsIncorrect2oikw",
  "New password cannot contain spaces":
    "uxFeatures.newPasswordCannotContainSpacesPlainxw6s8",
  "New password must be different from the current password":
    "uxFeatures.newPasswordMustBeDifferentFromiflj6",
  "The password changed while this request was in flight. Try again.":
    "uxFeatures.thePasswordChangedWhileTrybtwjw",
  "The password changed while this request was in flight. Sign in again.":
    "uxFeatures.thePasswordChangedWhileSign5zeef",
  "Desktop authentication failed":
    "uxFeatures.desktopAuthenticationFailedPlain2vdec",
  "Invalid or expired refresh token": "uxFeatures.invalidOrExpiredRefresh3sdyw",
  "Invalid or expired token": "uxFeatures.invalidOrExpiredTokenCapb6cyt",
  "A password is already set. Change it instead.":
    "uxFeatures.aPasswordIsAlreadySetvdnj2",
  "This action requires the LAiM desktop app.":
    "uxFeatures.thisActionRequiresTheLaim83thq",
  "Password change required": "uxFeatures.passwordChangeRequiredhaalx",
};

/** Anchored on the fixed opening of each backend hint; the capture is the part to keep. */
const PREFIXED_DETAIL_KEYS: {
  readonly prefix: string;
  readonly key: TranslationKey;
}[] = [
  {
    prefix: "Incorrect username, password or setup code. Ask the installation owner",
    key: "uxFeatures.incorrectUsernamePasswordOr6cqm6",
  },
  {
    prefix: "Incorrect password. To reset it, run this in your terminal",
    key: "uxFeatures.incorrectPasswordToResetwg7xd",
  },
];

export function translateAuthDetail(detail: string): string {
  const exact = EXACT_DETAIL_KEYS[detail];
  if (exact) return translate(exact);
  for (const { prefix, key } of PREFIXED_DETAIL_KEYS) {
    if (!detail.startsWith(prefix)) continue;
    const command = detail.slice(detail.lastIndexOf(":") + 1).trim();
    return translate(key, { p1: command });
  }
  const blocked = /^Too many failed login attempts\. Try again in (\d+) seconds\.$/.exec(
    detail,
  );
  if (blocked) return translate("uxFeatures.tooManyFailedLogini96mg", { p1: blocked[1] });
  return detail;
}
