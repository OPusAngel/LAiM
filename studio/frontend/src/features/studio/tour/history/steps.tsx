// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";
import { studioNavStep } from "../steps/nav";

export const studioHistoryTourSteps: TourStep[] = [
  studioNavStep,
  {
    id: "history",
    target: "studio-history",
    get title() {
      return translate("uxStudio.pastRuns1qytp");
    },
    get body() {
      return (
      <>
        {translate("uxStudio.everyFinishedOrStopped1so5r")}</>
    );
    },
  },
];
