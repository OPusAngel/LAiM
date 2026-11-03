// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { ReadMore, type TourStep } from "@/features/tour";

export const studioMethodStep: TourStep = {
  id: "method",
  target: "studio-method",
  get title() {
    return translate("uxStudio.trainingMethod1k0xc");
  },
  get body() {
    return (
    <>
      {translate("uxTour.qLoRATrainsAdaptersOn49tuo")}
      <ReadMore href="https://LAiM.ai/docs/basics/lora-hyperparameters-guide" />
    </>
  );
  },
};
