// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

export function buildProjectsTourSteps({
  hasProjects,
}: {
  hasProjects: boolean;
}): TourStep[] {
  const steps: TourStep[] = [
    {
      id: "new",
      target: "projects-new",
      title: translate("uxChat.makeAProjectyckvf"),
      get body() {
        return (
        <>
          {translate("uxChat.aProjectKeepsRelated8f3av")}</>
      );
      },
    },
    {
      id: "io",
      target: "projects-io",
      title: translate("browser.importBookmarksSetting"),
      get body() {
        return (
        <>
          {translate("uxChat.exportChatsAsJSONL164md")}</>
      );
      },
    },
  ];

  if (hasProjects) {
    steps.push({
      id: "list",
      target: "projects-list",
      title: translate("uxChat.openAProjectu05yq"),
      get body() {
        return (
        <>
          {translate("uxChat.clickARowTo9wwd8")}</>
      );
      },
    });
  }

  return steps;
}
