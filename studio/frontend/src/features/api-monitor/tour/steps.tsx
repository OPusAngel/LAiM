// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

export const apiMonitorTourSteps: TourStep[] = [
  {
    id: "endpoint",
    target: "api-endpoint",
    get title() {
      return translate("uxApimonitor.yourEndpoint1j84z");
    },
    get body() {
      return (
      <>
        {translate("uxTour.lAiMServesAnOpenAIl3zmk")}
      </>
    );
    },
  },
  {
    id: "toolbar",
    target: "api-toolbar",
    get title() {
      return translate("uxApimonitor.controls1wio9");
    },
    get body() {
      return (
      <>
        {translate("uxApimonitor.pauseTheLiveFeed1iid5")}</>
    );
    },
  },
  {
    id: "log",
    target: "api-log",
    get title() {
      return translate("uxApimonitor.requestLogb6x6l");
    },
    get body() {
      return (
      <>
        {translate("uxApimonitor.pickARequestOn1fcln")}</>
    );
    },
  },
];
