// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { ReadMore, type TourStep } from "@/features/tour";

export const studioDatasetStep: TourStep = {
  id: "dataset",
  target: "studio-dataset",
  get title() {
    return translate("studio.wizard.datasetTitle");
  },
  get body() {
    return (
    <>
      {translate("uxTour.searchTheHubOr1hf31")}
      <ReadMore href="https://LAiM.ai/docs/get-started/fine-tuning-llms-guide/datasets-guide" />
    </>
  );
  },
};
