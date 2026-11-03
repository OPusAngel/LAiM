// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

export const studioTrainingTourSteps: TourStep[] = [
  {
    id: "progress",
    target: "studio-training-progress",
    get title() {
      return translate("uxStudio.progressAndETA3hcs6");
    },
    get body() {
      return (
      <>
        {translate("uxStudio.phaseSaysWhatIs1acbd")}</>
    );
    },
  },
  {
    id: "train-loss",
    target: "studio-training-loss",
    get title() {
      return translate("uxStudio.trainingLossfbgfz");
    },
    get body() {
      return (
      <>
        {translate("uxStudio.watchTheDirectionNot18tx2")}</>
    );
    },
  },
  {
    id: "eval-loss",
    target: "studio-eval-loss",
    get title() {
      return translate("uxStudio.evalLoss1ud6s");
    },
    get body() {
      return (
      <>
        {translate("uxTour.yourSanityCheckTrainingj746w")}
      </>
    );
    },
  },
  {
    id: "stop",
    target: "studio-training-stop",
    get title() {
      return translate("uxImages.stopAndSavef2x1g");
    },
    get body() {
      return (
      <>
        {translate("uxStudio.stopAnyTimeStopmi0lg")}</>
    );
    },
  },
];
