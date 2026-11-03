// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TransportConflictInfo } from "@/features/hub/download-manager";

export type { TransportConflictInfo } from "@/features/hub/download-manager";

export function TransportConflictDialog({
  conflict,
  onCancel,
  onKeepTransport,
  onSwitchTransport,
}: {
  conflict: TransportConflictInfo | null;
  onCancel: () => void;
  // Continue on the partial download's existing transport (resumes if possible);
  // distinct from switching transport, which always restarts from scratch.
  onKeepTransport: () => void;
  onSwitchTransport: () => void;
}) {
  const previousLabel = conflict?.previous.toUpperCase() ?? "";
  const nextLabel = conflict?.next.toUpperCase() ?? "";
  const description = conflict?.resumable ? (
    <>{translate("uxHub.youStartedThisDownload672yx", { p1: " " })}<span className="font-medium text-foreground">{previousLabel}</span>{translate("uxHub.butYourCurrentSettingumrxt", { p1: " " })}<span className="font-medium text-foreground">{nextLabel}</span>{translate("uxHub.resumeWithToKeepkwm0t", { p1: previousLabel, p2: nextLabel })}</>
  ) : (
    <>{translate("uxHub.yourPreviousDownloadUsedgww9i", { p1: " " })}<span className="font-medium text-foreground">{previousLabel}</span>{translate("uxHub.whichCanTResumez81dd", { p1: previousLabel, p2: " ", p3: nextLabel })}</>
  );
  const primaryLabel = conflict?.resumable
    ? translate("uxHub.resumeWithqbc6v", { p1: previousLabel })
    : translate("uxHub.restartWithh10pt", { p1: previousLabel });
  const secondaryLabel = translate("uxHub.restartWithh10pt", { p1: nextLabel });
  return (
    <AlertDialog
      open={conflict !== null}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <AlertDialogContent className="sm:!max-w-[calc(22rem*var(--ui-space-scale,1))]">
        <AlertDialogHeader>
          <AlertDialogTitle>{translate("uxCopy.differentTransportModekbgct")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="!flex !flex-col gap-2 sm:!flex-col sm:!justify-stretch">
          <AlertDialogAction
            className="w-full"
            onClick={(e) => {
              e.preventDefault();
              onKeepTransport();
            }}
          >
            {primaryLabel}
          </AlertDialogAction>
          <AlertDialogAction
            variant="outline"
            className="w-full !bg-transparent hover:!bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              onSwitchTransport();
            }}
          >
            {secondaryLabel}
          </AlertDialogAction>
          <AlertDialogCancel className="w-full !bg-transparent hover:!bg-transparent">
            {translate("browser.agentSettings.cancel")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
