// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { ReadMore, type TourStep } from "@/features/tour";

export const studioParamsStep: TourStep = {
  id: "params",
  target: "studio-params",
  get title() {
    return translate("studio.wizard.paramsTitle");
  },
  get body() {
    return (
    <>
      {translate("uxTour.simpleCoversEpochsLearning5tnd7")}
      <ReadMore href="https://LAiM.ai/docs/basics/lora-hyperparameters-guide" />
    </>
  );
  },
};
