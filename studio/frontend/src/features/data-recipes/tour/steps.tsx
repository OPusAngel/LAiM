// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

/** The list and the learning-recipe cards are two branches of one slot; neither mounts until ready. */
export function buildDataRecipesTourSteps({
  ready,
  hasRecipes,
}: {
  ready: boolean;
  hasRecipes: boolean;
}): TourStep[] {
  const steps: TourStep[] = [
    {
      id: "new",
      target: "recipes-new",
      title: translate("uxDatarecipes.buildADataseta4grp"),
      get body() {
        return (
        <>
          {translate("uxDatarecipes.aRecipeTurnsRaw1tgmw")}</>
      );
      },
    },
  ];

  if (!ready) return steps;

  steps.push(
    hasRecipes
      ? {
          id: "list",
          target: "recipes-list",
          title: translate("uxDatarecipes.yourRecipes1cy9z"),
          get body() {
            return (
            <>
              {translate("uxDatarecipes.openOneToEdit1ojln")}</>
          );
          },
        }
      : {
          id: "templates",
          target: "recipes-templates",
          title: translate("uxDatarecipes.learningRecipesrpi0k"),
          get body() {
            return (
            <>
              {translate("uxDatarecipes.workedExamplesYouCan4u1df")}</>
          );
          },
        },
  );

  return steps;
}
