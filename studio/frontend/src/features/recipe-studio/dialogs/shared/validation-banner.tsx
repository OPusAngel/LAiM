// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { ReactElement } from "react";
import type { NodeConfig } from "../../types";
import { getConfigErrors } from "../../utils";
import { translate } from "@/i18n";


export function ValidationBanner({
  config,
}: {
  config: NodeConfig | null;
}): ReactElement | null {
  const errors = getConfigErrors(config);
  if (errors.length === 0) {
    return null;
  }
  return (
    <p className="text-xs text-amber-600">
      <span className="font-semibold">{translate("uxRecipestudio.needsAttention0j16f")}</span>
      {errors.join(". ")}.
    </p>
  );
}
