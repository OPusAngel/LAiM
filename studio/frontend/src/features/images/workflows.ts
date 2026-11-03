// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  ArrowExpand01Icon,
  Edit03Icon,
  ImageUpload01Icon,
  MagicWand01Icon,
  PaintBrush02Icon,
  SparklesIcon,
  ZoomInAreaIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type WorkflowId =
  | "create"
  | "transform"
  | "inpaint"
  | "extend"
  | "upscale"
  | "reference"
  | "edit";

/** The Images workflows, shared by the page and the sidebar submenu. `requires` is the backend
 *  workflow id (status.workflows) the loaded model must support; null = always available. */
export const WORKFLOW_TABS: Array<{
  id: WorkflowId;
  label: string;
  /** Page heading, when the sidebar's short label would read oddly on its own. Falls back to `label`. */
  heading?: string;
  requires: string | null;
  icon: IconSvgElement;
  hint: string;
}> = [
  {
    id: "create",
    get label() {
      return translate("uxImages.create16gte");
    },
    // The sidebar nests this under Images, so "Create" alone is clear there.
    get heading() {
      return translate("uxImages.createImages11lmw");
    },
    requires: null,
    // Not the pencil: that is the sidebar's New chat icon.
    icon: SparklesIcon,
    get hint() {
      return translate("uxImages.generateANewImagewuxmh");
    },
  },
  {
    id: "edit",
    get label() {
      return translate("uxImages.edit1i1lc");
    },
    icon: Edit03Icon,
    requires: "edit",
    get hint() {
      return translate("uxImages.changeAnImageWith1puio");
    },
  },
  {
    id: "transform",
    get label() {
      return translate("uxImages.transform1c55a");
    },
    icon: MagicWand01Icon,
    requires: "img2img",
    get hint() {
      return translate("uxImages.redrawAnImageFromum9um");
    },
  },
  {
    id: "inpaint",
    get label() {
      return translate("uxImages.inpaintyfia6");
    },
    icon: PaintBrush02Icon,
    requires: "inpaint",
    get hint() {
      return translate("uxImages.regenerateAPaintedRegion1w31c");
    },
  },
  {
    id: "extend",
    get label() {
      return translate("uxImages.extendz41i0");
    },
    icon: ArrowExpand01Icon,
    requires: "outpaint",
    get hint() {
      return translate("uxImages.growTheCanvasAnd1q3d7");
    },
  },
  {
    id: "upscale",
    get label() {
      return translate("uxImages.upscale71k05");
    },
    icon: ZoomInAreaIcon,
    requires: "upscale",
    get hint() {
      return translate("uxImages.enlargeAndReDetail1rfbp");
    },
  },
  {
    id: "reference",
    get label() {
      return translate("uxImages.reference1c7vr");
    },
    icon: ImageUpload01Icon,
    requires: "reference",
    get hint() {
      return translate("uxImages.generateGuidedByA17kj2");
    },
  },
];

/** Backend workflow id (what the PNG recipe stores) to the sidebar tab it maps to. */
const BACKEND_WORKFLOW_TO_TAB: Record<string, WorkflowId> = {
  txt2img: "create",
  img2img: "transform",
  edit: "edit",
  inpaint: "inpaint",
  outpaint: "extend",
  upscale: "upscale",
  reference: "reference",
};

/** Reads the label through the tab so the recipe chip follows the sidebar's language. */
export function recipeWorkflowLabel(workflow: string | null | undefined): string {
  if (!workflow) return WORKFLOW_TABS[0].label;
  const tabId = BACKEND_WORKFLOW_TO_TAB[workflow];
  if (!tabId) return workflow;
  return WORKFLOW_TABS.find((tab) => tab.id === tabId)?.label ?? workflow;
}

/** Placeholder hint per workflow, showing what each one is for. */
export const WORKFLOW_EXAMPLE_PROMPTS: Record<WorkflowId, string> = {
  get create() {
    return translate("uxImages.aCozyWoodenCabinyofs4");
  },
  get edit() {
    return translate("uxImages.makeTheSkyA1ah56");
  },
  get transform() {
    return translate("uxImages.turnThisIntoAjza7y");
  },
  get inpaint() {
    return translate("uxImages.aFluffyOrangeCat1qdof");
  },
  get extend() {
    return translate("uxImages.continueTheSceneOutwardcbb1i");
  },
  get upscale() {
    return translate("uxImages.sharpHighlyDetailedPhoto1pttf");
  },
  get reference() {
    return translate("uxImages.theCharacterFromThe632nm");
  },
};

