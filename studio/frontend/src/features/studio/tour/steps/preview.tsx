// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

/** The Start button sits inside this card, so one step covers the check and the launch. */
export const studioPreviewStep: TourStep = {
  id: "preview",
  target: "studio-run-preview",
  get title() {
    return translate("uxStudio.checkThenStartywwdu");
  },
  get body() {
    return (
    <>
      {translate("uxStudio.stepCountBatchSizejjzvx")}</>
  );
  },
};
