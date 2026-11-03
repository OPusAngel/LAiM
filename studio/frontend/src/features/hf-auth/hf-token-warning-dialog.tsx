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
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useHfTokenWarningStore } from "./store";
import { useHfTokenRejectedToast } from "./use-hf-token-rejected-toast";

export function HfTokenWarningDialog() {
  useHfTokenRejectedToast();
  const open = useHfTokenWarningStore((state) => state.open);
  const allowAnonymous = useHfTokenWarningStore(
    (state) => state.allowAnonymous,
  );
  const resolve = useHfTokenWarningStore((state) => state.resolve);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resolve("cancel");
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-1 text-left">
              <AlertDialogTitle>{translate("uxCopy.huggingFaceTokenIsqvqi2")}</AlertDialogTitle>
              <AlertDialogDescription>
                {allowAnonymous
                  ? "Hugging Face rejected the saved token. Replace it to access private or gated repositories, or continue without it for public and fully downloaded models."
                  : "Hugging Face rejected the saved token. Replace it before uploading to the Hub."}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <AlertDialogCancel onClick={() => resolve("cancel")}>
            {translate("browser.agentSettings.cancel")}
          </AlertDialogCancel>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {allowAnonymous ? (
              <Button variant="outline" onClick={() => resolve("anonymous")}>
                {translate("uxFeatures.continueWithoutTokenxqivl")}
              </Button>
            ) : null}
            <AlertDialogAction onClick={() => resolve("replace")}>
              {translate("uxFeatures.replaceToken1oprh")}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
