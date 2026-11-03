// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

const catalogStep: TourStep = {
  id: "catalog",
  target: "hub-catalog",
  get title() {
    return translate("uxVideo.results17jx8");
  },
  get body() {
    return (
    <>
      {translate("uxHub.openAnyModelForvitn7")}</>
  );
  },
};

const detailStep: TourStep = {
  id: "detail",
  target: "hub-detail",
  get title() {
    return translate("uxHub.modelDetails48huc");
  },
  get body() {
    return (
    <>
      {translate("uxHub.filesQuantVariantsAnds8i7i")}</>
  );
  },
};

/** Outside split view an open model detail covers the catalog, so describe what is on top. */
export function buildHubTourSteps({
  catalogCovered,
}: {
  catalogCovered: boolean;
}): TourStep[] {
  return [
    {
      id: "tabs",
      target: "hub-tabs",
      get title() {
        return translate("uxHub.discoverOrOnDevice1ph5e");
      },
      get body() {
        return (
        <>
          {translate("uxHub.discoverBrowsesHuggingFacey6b1u")}</>
      );
      },
    },
    {
      id: "search",
      target: "hub-search",
      get title() {
        return translate("uxHub.searchTheHubpjnzl");
      },
      get body() {
        return (
        <>
          {translate("uxTour.searchByNameOr5l10l")}{" "}
          <span className="font-mono">org/model</span>
          {translate("uxTour.toJumpStraightToum4jg")}
        </>
      );
      },
    },
    {
      id: "device",
      target: "hub-device",
      get title() {
        return translate("uxHub.yourHardware1uoki");
      },
      get body() {
        return (
        <>
          {translate("uxTour.vRAMRAMAndCachevymur")}
        </>
      );
      },
    },
    catalogCovered ? detailStep : catalogStep,
  ];
}
