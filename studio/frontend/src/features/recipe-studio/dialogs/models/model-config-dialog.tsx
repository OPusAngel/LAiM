// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ReactElement, useEffect, useRef, useState } from "react";
import type { ModelConfig } from "../../types";
import { CollapsibleSectionTriggerButton } from "../shared/collapsible-section-trigger";
import { FieldLabel } from "../shared/field-label";
import { NameField } from "../shared/name-field";
import { LocalRecipeModelSelector } from "./local-recipe-model-selector";

type ModelConfigDialogProps = {
  config: ModelConfig;
  providerOptions: string[];
  localProviderNames: Set<string>;
  onUpdate: (patch: Partial<ModelConfig>) => void;
};

export function ModelConfigDialog({
  config,
  providerOptions,
  localProviderNames,
  onUpdate,
}: ModelConfigDialogProps): ReactElement {
  const isLinkedToLocal = localProviderNames.has(config.provider);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const modelId = `${config.id}-model`;
  const providerId = `${config.id}-provider`;
  const tempId = `${config.id}-temperature`;
  const topPId = `${config.id}-top-p`;
  const maxTokensId = `${config.id}-max-tokens`;
  const timeoutId = `${config.id}-timeout`;
  const extraBodyId = `${config.id}-inference-extra-body`;
  const skipHealthCheckId = `${config.id}-skip-health-check`;
  const providerAnchorRef = useRef<HTMLDivElement>(null);
  const providerInputRef = useRef(config.provider);
  // Sync providerInputRef in an effect (not during render) to satisfy the
  // react-hooks/refs rule and keep the combobox blur path stable.
  useEffect(() => {
    providerInputRef.current = config.provider;
  }, [config.provider]);
  const updateField = <K extends keyof ModelConfig>(
    key: K,
    value: ModelConfig[K],
  ) => {
    onUpdate({ [key]: value } as Partial<ModelConfig>);
  };

  // Apply provider selection while clearing model identifiers that only make
  // sense for the previous provider locality.
  const applyProviderChange = (selectedProvider: string) => {
    const nextIsLocal = localProviderNames.has(selectedProvider);
    if (isLinkedToLocal !== nextIsLocal) {
      onUpdate({
        provider: selectedProvider,
        model: "",
        // biome-ignore lint/style/useNamingConvention: api schema
        gguf_variant: undefined,
      });
      return;
    }
    if (!nextIsLocal) {
      onUpdate({
        provider: selectedProvider,
        // biome-ignore lint/style/useNamingConvention: api schema
        gguf_variant: undefined,
      });
      return;
    }
    updateField("provider", selectedProvider);
  };

  return (
    <div className="space-y-4">
      <NameField
        label={translate("uxRecipestudio.modelPresetNamewplgz")}
        value={config.name}
        onChange={(value) => onUpdate({ name: value })}
      />
      <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">
          {translate("uxRecipestudio.setUpOneReusable1gg2s")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {translate("uxCopy.chooseTheProviderConnectionmtbq5")}
        </p>
      </div>
      <div className="grid gap-1.5">
        <FieldLabel
          label={translate("uxRecipestudio.providerConnection1307t")}
          htmlFor={providerId}
          hint={translate("uxRecipestudio.chooseWhereThisModel117rb")}
        />
        <div ref={providerAnchorRef}>
          <Combobox
            items={providerOptions}
            filteredItems={providerOptions}
            filter={null}
            value={config.provider || null}
            onValueChange={(value) => applyProviderChange(value ?? "")}
            onInputValueChange={(value) => {
              providerInputRef.current = value;
            }}
            itemToStringValue={(value) => value}
            autoHighlight={true}
          >
            <ComboboxInput
              id={providerId}
              className="nodrag w-full"
              placeholder={translate("uxRecipestudio.chooseAProviderConnection1ca90")}
              onBlur={() => {
                const next = providerInputRef.current;
                if (next !== config.provider) {
                  applyProviderChange(next);
                }
              }}
            />
            <ComboboxContent anchor={providerAnchorRef}>
              <ComboboxEmpty>{translate("uxCopy.noProvidersFoundubx4m")}</ComboboxEmpty>
              <ComboboxList>
                {(provider: string) => (
                  <ComboboxItem key={provider} value={provider}>
                    {provider}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <p className="text-xs text-muted-foreground">
          {providerOptions.length === 0
            ? translate("uxRecipestudio.addAProviderConnectionagaps")
            : translate("uxRecipestudio.matchingBlocksAreLinkedgfrkx")}
        </p>
      </div>
      <div className="grid gap-1.5">
        <FieldLabel
          label={translate("uxModelpicker.modelID14cxu")}
          htmlFor={modelId}
          hint={
            isLinkedToLocal
              ? translate("uxRecipestudio.chooseTheLocalModelkatpa")
              : translate("uxRecipestudio.theExactModelName1pvgy")
          }
        />
        {isLinkedToLocal ? (
          <LocalRecipeModelSelector
            inputId={modelId}
            value={
              config.model.trim().toLowerCase() === "local" ? "" : config.model
            }
            ggufVariant={config.gguf_variant}
            onChange={(model, variant) =>
              onUpdate({
                model,
                // biome-ignore lint/style/useNamingConvention: api schema
                gguf_variant: variant ?? undefined,
              })
            }
          />
        ) : (
          <Input
            id={modelId}
            className="nodrag"
            placeholder={translate("uxRecipestudio.gpt4oMininzetj")}
            value={config.model}
            onChange={(event) =>
              onUpdate({
                model: event.target.value,
                // biome-ignore lint/style/useNamingConvention: api schema
                gguf_variant: undefined,
              })
            }
          />
        )}
        {isLinkedToLocal ? (
          <p className="text-xs text-muted-foreground">
            {translate("uxCopy.recipesWillLoadThisz5cz4")}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {translate("uxRecipestudio.defaultGenerationSettings14esj")}
          </p>
          <p className="text-xs text-muted-foreground">
            {translate("uxRecipestudio.theseDefaultsAreReusedmgsiq")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("settings.resources.liveMonitor.temperature")}
              htmlFor={tempId}
              hint={translate("uxRecipestudio.higherValuesMakeResponses10dot")}
            />
            <Input
              id={tempId}
              className="nodrag"
              value={config.inference_temperature ?? ""}
              onChange={(event) =>
                updateField("inference_temperature", event.target.value)
              }
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.topPrptck")}
              htmlFor={topPId}
              hint={translate("uxRecipestudio.useThisToLimitl3ucn")}
            />
            <Input
              id={topPId}
              className="nodrag"
              value={config.inference_top_p ?? ""}
              onChange={(event) =>
                updateField("inference_top_p", event.target.value)
              }
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxAudio.maxTokenseefvt")}
              htmlFor={maxTokensId}
              hint={translate("uxRecipestudio.maximumLengthOfThen718x")}
            />
            <Input
              id={maxTokensId}
              className="nodrag"
              value={config.inference_max_tokens ?? ""}
              onChange={(event) =>
                updateField("inference_max_tokens", event.target.value)
              }
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.timeoutSeconds65n31")}
              htmlFor={timeoutId}
              hint={translate("uxRecipestudio.howLongToWait17q1h")}
            />
            <Input
              id={timeoutId}
              className="nodrag"
              value={config.inference_timeout ?? ""}
              onChange={(event) =>
                updateField("inference_timeout", event.target.value)
              }
            />
          </div>
        </div>
      </div>
      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
        <CollapsibleTrigger asChild={true}>
          <CollapsibleSectionTriggerButton
            label={translate("uxRecipestudio.advancedRequestFields4dglo")}
            open={optionalOpen}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4">
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.advancedRequestFieldsJSONc3er0")}
              htmlFor={extraBodyId}
              hint={translate("uxRecipestudio.extraRequestFieldsTomhlnl")}
            />
            <Textarea
              id={extraBodyId}
              className="corner-squircle nodrag"
              placeholder='{"top_k": 20, "min_p": 0.0}'
              value={config.inference_extra_body ?? ""}
              onChange={(event) =>
                updateField("inference_extra_body", event.target.value)
              }
            />
          </div>
          <label
            htmlFor={skipHealthCheckId}
            className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"
          >
            <Checkbox
              id={skipHealthCheckId}
              checked={config.skip_health_check ?? false}
              onCheckedChange={(value) =>
                updateField("skip_health_check", Boolean(value))
              }
            />
            {translate("uxRecipestudio.skipConnectionChecka9zlu")}
          </label>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
