// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { LazyImportBoundary } from "@/components/lazy-import-boundary";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { type ComponentProps, Suspense, lazy, useLayoutEffect } from "react";
import type { ModelPickTarget } from "../components/model-selector/types";
import {
  isExtraArgsHydratedForDraft,
  modelConfigDraftKey,
} from "../model-config/model-config-draft";
import { runConfigInbox } from "./inbox";
import { isRunConfigVariantUnresolved } from "./target";

const SharedRunConfigActions = lazy(() =>
  import("./config-ui").then((module) => ({
    default: module.SharedRunConfigActions,
  })),
);

const ConfigReview = lazy(() =>
  import("./config-ui").then((module) => ({
    default: module.SharedRunConfigReview,
  })),
);

export function isRunConfigEditorChange(event: {
  currentTarget: Node;
  target: EventTarget;
}): boolean {
  return (
    event.target instanceof Node && event.currentTarget.contains(event.target)
  );
}

export function SharedRunConfigReview({
  target,
  ...props
}: ComponentProps<typeof ConfigReview> & { target: ModelPickTarget }) {
  return (
    <>
      {props.imported && (
        <LazyImportBoundary
          fallback={
            <p role="alert" className="mb-5 text-ui-12 text-muted-foreground">
              {translate("uxCopy.theLinkSettingsSummary1b8em")}
            </p>
          }
        >
          <Suspense fallback={null}>
            <ConfigReview {...props} />
          </Suspense>
        </LazyImportBoundary>
      )}
      {isRunConfigVariantUnresolved(target) && (
        <p
          role="status"
          className="mb-5 border-b border-border pb-5 text-pretty text-ui-12 leading-relaxed text-muted-foreground"
        >
          {translate("uxCopy.theGGUFVariantCouldw4r6a")}
        </p>
      )}
    </>
  );
}

export function SharedRunConfigControls({
  isDiffusion,
  ...props
}: Omit<
  ComponentProps<typeof SharedRunConfigActions>,
  "hydrated" | "draftKey"
> & {
  isDiffusion: boolean;
}) {
  const { target, canImport } = props;
  const key = modelConfigDraftKey(
    target.configId ?? target.id,
    target.ggufVariant,
  );
  useLayoutEffect(() => {
    if (canImport) {
      return runConfigInbox.retainEditor(key, (request) => {
        toast.info(translate("uxModelpicker.runSettingsImportCancelledcrgwm"), {
          id: request.id,
          description:
            translate("uxModelpicker.theEditorClosedBeforeesvt8"),
        });
      });
    }
  }, [canImport, key]);
  const fallback = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={props.className}
      disabled
    >
      Share
    </Button>
  );
  return (
    <LazyImportBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <SharedRunConfigActions
          {...props}
          draftKey={key}
          hydrated={isDiffusion || isExtraArgsHydratedForDraft(key)}
        />
      </Suspense>
    </LazyImportBoundary>
  );
}
