// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

/** Without an Easy form the tabs read Editor and Runs, so neither "three" nor "Advanced" fits. */
function viewsStep(supportsEasyMode: boolean): TourStep {
  return {
    id: "views",
    target: "recipe-views",
    title: supportsEasyMode ? translate("uxRecipestudio.threeViewsb43zx") : translate("uxRecipestudio.twoViewsxv8na"),
    body: supportsEasyMode ? (
      <>
        {translate("uxRecipestudio.easyIsAPlainv0cq5")}</>
    ) : (
      <>
        {translate("uxRecipestudio.editorIsTheNode1mcof")}</>
    ),
  };
}

const saveStep: TourStep = {
  id: "save",
  target: "recipe-save",
  get title() {
    return translate("browser.downloadPrompt.save");
  },
  get body() {
    return <>{translate("uxTour.recipesAreStoredOn1p6oi")}</>;
  },
};

/** Only the graph view mounts the canvas and its controls, and only once the recipe has loaded. */
export function buildRecipeEditorTourSteps({
  isGraphView,
  supportsEasyMode,
}: {
  isGraphView: boolean;
  supportsEasyMode: boolean;
}): TourStep[] {
  if (!isGraphView) {
    return [viewsStep(supportsEasyMode), saveStep];
  }

  return [
    viewsStep(supportsEasyMode),
    {
      id: "canvas",
      target: "recipe-canvas",
      get title() {
        return translate("uxRecipestudio.theGraphw1hey");
      },
      get body() {
        return (
        <>
          {translate("uxRecipestudio.eachNodeIsOnecaxhv")}</>
      );
      },
    },
    {
      id: "add-step",
      target: "recipe-add-step",
      get title() {
        return translate("uxRecipestudio.addAStepm84xt");
      },
      get body() {
        return (
        <>
          {translate("uxRecipestudio.sourceDataSamplersModeltpxvo")}</>
      );
      },
    },
    {
      id: "run",
      target: "recipe-run",
      get title() {
        return translate("uxRecipestudio.checkAndRun1k8dt");
      },
      get body() {
        return (
        <>
          {translate("uxRecipestudio.checkReportsBrokenWiresjg1qd")}</>
      );
      },
    },
  ];
}
