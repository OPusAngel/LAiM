// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

const modeStep: TourStep = {
  id: "mode",
  target: "images-mode",
  get title() {
    return translate("uxImages.createOrTrain1h550");
  },
  get body() {
    return (
    <>
      {translate("uxImages.createGeneratesImagesTrain1ijgn")}</>
  );
  },
};

/** Create and Train swap the whole page body, so each mode gets the anchors it actually has. */
export function buildImagesTourSteps({
  pageMode,
}: {
  pageMode: "create" | "train";
}): TourStep[] {
  if (pageMode === "train") {
    return [
      modeStep,
      {
        id: "train-dataset",
        target: "images-train-dataset",
        get title() {
          return translate("uxImages.yourImagess6fjz");
        },
        get body() {
          return (
          <>
            {translate("uxImages.dropInAFolder115e2")}</>
        );
        },
      },
      {
        id: "train-start",
        target: "images-train-start",
        get title() {
          return translate("uxImages.startTraining1mm8r");
        },
        get body() {
          return (
          <>
            {translate("uxImages.runsALoRAOn130zj")}</>
        );
        },
      },
    ];
  }

  return [
    modeStep,
    {
      id: "model",
      target: "images-model",
      get title() {
        return translate("uxVideo.pickAModelx7b6j");
      },
      get body() {
        return (
        <>
          {translate("uxImages.imageModelsYouHave1aohl")}</>
      );
      },
    },
    {
      id: "settings",
      target: "images-settings",
      get title() {
        return translate("shell.navigation.settings");
      },
      get body() {
        return (
        <>
          {translate("uxImages.promptAspectRatioStepsjjzps")}</>
      );
      },
    },
    {
      id: "preview",
      target: "images-preview",
      get title() {
        return translate("uxVideo.results17jx8");
      },
      get body() {
        return (
        <>
          {translate("uxImages.theSelectedImageFills72iqi")}</>
      );
      },
    },
  ];
}
