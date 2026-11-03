// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { useEffect, useState } from "react";

import { ModelLoadDescription } from "@/features/chat";
import { formatBytes, type StagedDownloadProgress } from "@/features/hub";
import {
  createPickToast,
  type PickToast,
  type PickToastPhase,
  type PickToastProgress,
} from "@/lib/diffusion-pick-toast";

// Match the load toast's styling for a seamless handoff.
const PICK_TOAST_CLASSNAMES = {
  toast: "chat-model-load-toast items-center gap-2.5",
  content: "gap-0.5 flex-1 min-w-0",
  title: "leading-5",
  description: "mt-0 w-full",
};

function describePick(phase: PickToastPhase, progress: PickToastProgress | null) {
  if (phase === "downloading") {
    return (
      <ModelLoadDescription
        title={translate("uxLib.downloadingModel15lwb")}
        message={translate("uxFeatures.theModelLoadsOncesyo2h")}
        progressPercent={
          progress ? (progress.downloadedBytes / progress.totalBytes) * 100 : null
        }
        progressLabel={
          progress
            ? `${formatBytes(progress.downloadedBytes)} of ${formatBytes(progress.totalBytes)}`
            : null
        }
      />
    );
  }
  if (phase === "queued") {
    return (
      <ModelLoadDescription
        title={translate("uxLib.downloadQueued132xf")}
        message={translate("uxFeatures.itStartsOnceTherjumc")}
      />
    );
  }
  if (phase === "waiting") {
    return (
      <ModelLoadDescription
        title={translate("uxLib.modelDownloaded8hx3p")}
        message={translate("uxFeatures.itLoadsOnceThe59o6m")}
      />
    );
  }
  if (phase === "ready") {
    return (
      <ModelLoadDescription
        title={translate("uxLib.modelDownloaded8hx3p")}
        message="It loads when you return to this page."
      />
    );
  }
  return (
    <ModelLoadDescription
      title={translate("uxLib.preparingDownload1dwta")}
      message={translate("uxFeatures.checkingWhichFilesThistiqgo")}
    />
  );
}

/** One pick toast per page, dropped with the page. */
export function useDiffusionPickToast(): PickToast {
  const [pickToast] = useState(() =>
    createPickToast({ describe: describePick, classNames: PICK_TOAST_CLASSNAMES }),
  );
  useEffect(() => () => pickToast.dismissAll(), [pickToast]);
  return pickToast;
}

/** Bind progress separately because staging is initialized after the pick toast. */
export function usePickToastProgress(
  pickToast: PickToast,
  progress: StagedDownloadProgress | null,
): void {
  useEffect(() => {
    pickToast.progress(progress);
  }, [pickToast, progress]);
}
