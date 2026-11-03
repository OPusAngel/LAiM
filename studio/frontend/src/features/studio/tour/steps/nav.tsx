// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { ReadMore, type TourStep } from "@/features/tour";

export const studioNavStep: TourStep = {
  id: "nav",
  target: "studio-subnav",
  get title() {
    return translate("uxStudio.threeTabskbupu");
  },
  get body() {
    return (
    <>
      {translate("uxTour.configureSetsUpAtqg62")}
      <ReadMore href="https://LAiM.ai/docs/get-started/fine-tuning-for-beginners" />
    </>
  );
  },
};
