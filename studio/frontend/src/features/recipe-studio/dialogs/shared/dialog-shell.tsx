// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReactElement } from "react";
import { translate } from "@/i18n";


type DialogShellProps = {
  title?: string;
  description?: string;
};

export function DialogShell({
  title = translate("uxRecipestudio.editSteph9l4o"),
  description = translate("uxRecipestudio.updateThisStepBeforeckzvb"),
}: DialogShellProps): ReactElement {
  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}
