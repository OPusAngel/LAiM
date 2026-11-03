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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { PackageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  upgradeDialogActions,
  upgradeInstallVersion,
} from "../lib/upgrade-dialog-actions";
import { useTransformersUpgradeDialogStore } from "../stores/transformers-upgrade-dialog-store";

function modelDisplayName(modelName: string | null): string {
  if (!modelName) return "This model";
  return modelName.split("/").pop() || modelName;
}

/** Root-mounted consent dialog for models needing a newer transformers;
 *  Install runs the sidecar install and resumes the paused load on success. */
export function TransformersUpgradeDialog() {
  const open = useTransformersUpgradeDialogStore((s) => s.open);
  const modelName = useTransformersUpgradeDialogStore((s) => s.modelName);
  const upgrade = useTransformersUpgradeDialogStore((s) => s.upgrade);
  const phase = useTransformersUpgradeDialogStore((s) => s.phase);
  const errorMessage = useTransformersUpgradeDialogStore((s) => s.errorMessage);
  const trustRemoteCodeFallback = useTransformersUpgradeDialogStore(
    (s) => s.trustRemoteCodeFallback,
  );
  const install = useTransformersUpgradeDialogStore((s) => s.install);
  const resolve = useTransformersUpgradeDialogStore((s) => s.resolve);

  const displayName = modelDisplayName(modelName);
  const modelType = upgrade?.model_type ?? "unknown";
  const version = upgradeInstallVersion(upgrade);
  const { installable, fromMain, devOnly, customCode } = upgradeDialogActions({
    upgrade,
    phase,
    trustRemoteCodeFallback,
  });
  const installing = phase === "installing";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Escape/overlay dismiss must not abandon an in-flight install.
        if (!next && !installing) resolve(false);
      }}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader className="min-w-0">
          <div className="flex w-full min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <HugeiconsIcon icon={PackageIcon} className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <AlertDialogTitle>{translate("uxCopy.newModelArchitecture1rrcd")}</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">
                    {displayName}
                  </span>{translate("uxFeatures.usesThe88rog", { p1: " ", p2: " " })}<span className="font-mono text-foreground">{modelType}</span>{" "}
                  architecture, which your installed transformers does not
                  support yet.{" "}
                  {installable && fromMain ? (
                    <>{translate("uxFeatures.noTransformersReleaseSupportsr8mhi", { p1: " " })}<span className="font-medium text-foreground">
                        {version}
                      </span>{translate("uxFeatures.fromMainToLoadht1vo", { p1: " " })}</>
                  ) : installable ? (
                    <>{translate("uxFeatures.installTransformerscw7rd", { p1: " " })}<span className="font-medium text-foreground">
                        {version}
                      </span>{translate("uxFeatures.fromPyPIToLoadf9tax", { p1: " " })}</>
                  ) : devOnly ? (
                    <>
                      {translate("uxFeatures.evenTheLatestTransformers183pa")}</>
                  ) : (
                    <>
                      {translate("uxFeatures.noReleasedTransformersVersion1udww")}</>
                  )}
                  {customCode ? (
                    <>{translate("uxFeatures.thisModelAlsoShipse9gie", { p1: " " })}</>
                  ) : null}
                </AlertDialogDescription>
              </div>

              {phase === "error" && errorMessage ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  {errorMessage}
                </p>
              ) : null}

              {installing ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner className="size-3.5" />{translate("uxFeatures.installingTransformersThisCaneu3pe", { p1: version })}</p>
              ) : null}
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={installing}>Cancel</AlertDialogCancel>
          {installable ? (
            <>
              {customCode ? (
                // The model ships custom code, so the caller's trust_remote_code gate
                // loads it on the installed transformers. Offered next to Install, not
                // only after one fails: installing activates the 16-bit sidecar, so this
                // is the only way a 4-bit run on this model can start.
                <AlertDialogAction
                  className="bg-transparent text-foreground hover:bg-accent"
                  onClick={() => resolve(true)}
                >
                  {translate("uxFeatures.continueWithCustomCode16y8y")}
                </AlertDialogAction>
              ) : null}
              <AlertDialogAction
                disabled={installing}
                className={cn(installing && "pointer-events-none")}
                onClick={(event) => {
                  // Keep the dialog open; the store closes it on success.
                  event.preventDefault();
                  void install();
                }}
              >
                {installing ? (
                  <>
                    <Spinner className="size-4" />
                    {translate("settings.resources.llamaBackend.applying")}
                  </>
                ) : phase === "error" ? (
                  "Retry install"
                ) : (
                  `Install transformers ${version}`
                )}
              </AlertDialogAction>
            </>
          ) : customCode ? (
            // No installable release but the model ships custom code: continue
            // into the caller's trust_remote_code gate as the last resort.
            <AlertDialogAction onClick={() => resolve(true)}>
              {translate("uxFeatures.continueWithCustomCode16y8y")}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
