// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { toast } from "sonner";

export function showForkCreatedToast(containerSnapshotWarning: string | null): void {
  if (containerSnapshotWarning) {
    toast.info(translate("uxChat.forkCreated1hl35"), { description: containerSnapshotWarning });
  } else {
    toast.success(translate("uxChat.forkCreated1hl35"));
  }
}
