// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { ReadMore, type TourStep } from "@/features/tour";

export const studioBaseModelStep: TourStep = {
  id: "base-model",
  target: "studio-model-picker",
  get title() {
    return translate("library.preview.baseModel");
  },
  get body() {
    return (
    <>
      {translate("uxTour.searchHuggingFaceReuse12nau")}{" "}
      <span className="font-mono">org/model</span>
      {translate("uxTour.sensibleHyperparametersSmallerModeerr7z")}
      <ReadMore href="https://LAiM.ai/docs/get-started/fine-tuning-llms-guide/what-model-should-i-use" />
    </>
  );
  },
};
