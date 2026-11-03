// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VisuallyHidden } from "radix-ui";
import { type ReactElement, useMemo } from "react";
import type { RecipeProcessorConfig } from "../types";
import { buildDefaultSchemaTransform } from "../utils/processors";
import { AvailableVariables } from "./shared/available-variables";
import { FieldLabel } from "./shared/field-label";
import { RecipeDialogContent } from "./shared/recipe-dialog-content";
type ProcessorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processors: RecipeProcessorConfig[];
  onProcessorsChange: (processors: RecipeProcessorConfig[]) => void;
  container?: HTMLDivElement | null;
};

export function ProcessorsDialog({
  open,
  onOpenChange,
  processors,
  onProcessorsChange,
  container,
}: ProcessorsDialogProps): ReactElement {
  const schemaIndex = useMemo(
    () =>
      processors.findIndex(
        (processor) => processor.processor_type === "schema_transform",
      ),
    [processors],
  );
  const schemaProcessor = schemaIndex >= 0 ? processors[schemaIndex] : null;
  const nameId = schemaProcessor ? `${schemaProcessor.id}-name` : "schema-transform-name";
  const templateId = schemaProcessor
    ? `${schemaProcessor.id}-template`
    : "schema-transform-template";

  const setSchemaEnabled = (enabled: boolean) => {
    if (enabled) {
      if (schemaProcessor) {
        return;
      }
      onProcessorsChange([...processors, buildDefaultSchemaTransform()]);
      return;
    }
    onProcessorsChange(
      processors.filter(
        (processor) => processor.processor_type !== "schema_transform",
      ),
    );
  };

  const updateSchema = (patch: Partial<RecipeProcessorConfig>) => {
    if (!schemaProcessor) {
      return;
    }
    const next = [...processors];
    next[schemaIndex] = { ...schemaProcessor, ...patch };
    onProcessorsChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <RecipeDialogContent
        container={container}
        viewportClassName="overflow-auto"
      >
        <VisuallyHidden.Root>
          <DialogTitle>Processors</DialogTitle>
        </VisuallyHidden.Root>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 corner-squircle rounded-2xl border border-border/60 px-3 py-2">
            <div>
              <p className="text-sm font-semibold">{translate("uxRecipestudio.schemaTransform1j7gm")}</p>
              <p className="text-xs text-muted-foreground">
                {translate("uxRecipestudio.transformFinalRowsTonc71e")}
              </p>
            </div>
            <Switch
              checked={Boolean(schemaProcessor)}
              onCheckedChange={setSchemaEnabled}
            />
          </div>

          {schemaProcessor && (
            <div className="space-y-3">
              <AvailableVariables configId="" />
              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("browser.bookmarks.name")}
                  htmlFor={nameId}
                  hint={translate("uxRecipestudio.processorNameShownIn1g500")}
                />
                <Input
                  id={nameId}
                  className="nodrag"
                  value={schemaProcessor.name}
                  onChange={(event) => updateSchema({ name: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("uxRecipestudio.templateJSONq42gj")}
                  htmlFor={templateId}
                  hint={translate("uxRecipestudio.targetOutputSchemaTemplate1dcgl")}
                />
                <Textarea
                  id={templateId}
                  className="corner-squircle nodrag min-h-[calc(220px*var(--ui-space-scale,1))]"
                  value={schemaProcessor.template}
                  onChange={(event) =>
                    updateSchema({ template: event.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">{translate("uxRecipestudio.useJinjaRefsLike9us3u", { p1: "{{ customer_review }}" })}</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </RecipeDialogContent>
    </Dialog>
  );
}
