// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";

export const exportTourSteps: TourStep[] = [
  {
    id: "training-run",
    target: "export-training-run",
    get title() {
      return translate("uxExport.pickARunfyazi");
    },
    get body() {
      return (
      <>
        {translate("uxExport.startHereEachRun16s3v")}</>
    );
    },
  },
  {
    id: "checkpoint",
    target: "export-checkpoint",
    get title() {
      return translate("uxExport.pickACheckpoint1s13r");
    },
    get body() {
      return (
      <>
        {translate("uxExport.theLastCheckpointIsy51nf")}</>
    );
    },
  },
  {
    id: "method",
    target: "export-method",
    get title() {
      return translate("uxExport.chooseAFormatdj43i");
    },
    get body() {
      return (
      <>
        {translate("uxExport.mergedIsAFull11173")}</>
    );
    },
  },
  {
    id: "cta",
    target: "export-cta",
    get title() {
      return translate("browser.exportBookmarks");
    },
    get body() {
      return (
      <>
        {translate("uxExport.saveToThisDevicenwdlm")}</>
    );
    },
  },
];
