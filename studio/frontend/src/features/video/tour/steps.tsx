// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

export const videoTourSteps: TourStep[] = [
  {
    id: "model",
    target: "video-model",
    get title() {
      return translate("uxVideo.pickAModelx7b6j");
    },
    get body() {
      return (
      <>
        {translate("uxTour.videoModelsRunLocally11p37")}
      </>
    );
    },
  },
  {
    id: "settings",
    target: "video-settings",
    get title() {
      return translate("shell.navigation.settings");
    },
    get body() {
      return (
      <>
        {translate("uxTour.promptResolutionDurationIn1rxvi")}
      </>
    );
    },
  },
  {
    id: "preview",
    target: "video-preview",
    get title() {
      return translate("uxVideo.results17jx8");
    },
    get body() {
      return (
      <>
        {translate("uxTour.theSelectedClipPlays12tt9")}
      </>
    );
    },
  },
];
