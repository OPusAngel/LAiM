// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

export function buildChatTourSteps({
  canShowNav,
  canCompare,
  openModelSelector,
  closeModelSelector,
  openSettings,
  closeSettings,
  enterCompare,
  exitCompare,
}: {
  canShowNav: boolean;
  canCompare: boolean;
  openModelSelector: () => void;
  closeModelSelector: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  enterCompare: () => void;
  exitCompare: () => void;
}): TourStep[] {
  const steps: TourStep[] = [
    {
      id: "model",
      target: "chat-model-selector",
      title: translate("uxVideo.pickAModelx7b6j"),
      get body() {
        return (
        <>
          {translate("uxChat.loadsAModelForvx0dn")}</>
      );
      },
    },
    {
      id: "model-tabs",
      target: "chat-model-selector-popover",
      title: translate("uxChat.findAModel5g12x"),
      get body() {
        return (
        <>
          {translate("uxChat.recommendedIsLAiMS1xsbp")}</>
      );
      },
      onEnter: openModelSelector,
      onExit: closeModelSelector,
    },
    {
      id: "plus-menu",
      target: "chat-plus-menu",
      title: translate("uxChat.toolsAndAttachments1mnow"),
      get body() {
        return (
        <>
          {translate("uxChat.openThisToAttach1mibd")}</>
      );
      },
    },
    {
      id: "settings",
      target: "chat-settings",
      title: translate("uxModelpicker.runSettingsmw4kg"),
      get body() {
        return (
        <>
          {translate("uxChat.temperatureTopPTopr9h79")}</>
      );
      },
      onEnter: openSettings,
      onExit: closeSettings,
    },
  ];

  if (canShowNav) {
    // The mobile sidebar is a closed sheet, so there is nothing to spotlight there.
    steps.unshift({
      id: "nav",
      target: "navbar",
      title: translate("uxChat.whereEverythingLivesl206p"),
      get body() {
        return (
        <>
          {translate("uxChat.chatRunsModelsTraina2l8a")}</>
      );
      },
    });
  }

  if (canCompare) {
    // Compare lives in the + menu, with no sidebar button to anchor to; this step enters compare on
    // its own and explains it.
    steps.push({
      id: "compare-view",
      target: "chat-compare-view",
      title: translate("uxChat.compareTwoModelsi5ymz"),
      get body() {
        return (
        <>
          {translate("uxChat.onePromptTwoThreads1uz60")}</>
      );
      },
      onEnter: enterCompare,
      onExit: exitCompare,
    });
  }

  return steps;
}
