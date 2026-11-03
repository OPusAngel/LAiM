// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type ReactElement, useMemo, useState } from "react";
import type { ModelProviderConfig } from "../../types";
import {
  MODEL_PROVIDER_TYPE_OPTIONS,
  normalizeModelProviderType,
} from "../../utils/model-provider-types";
import { CollapsibleSectionTriggerButton } from "../shared/collapsible-section-trigger";
import { FieldLabel } from "../shared/field-label";
import { NameField } from "../shared/name-field";

type ModelProviderDialogProps = {
  config: ModelProviderConfig;
  onUpdate: (patch: Partial<ModelProviderConfig>) => void;
};

export function ModelProviderDialog({
  config,
  onUpdate,
}: ModelProviderDialogProps): ReactElement {
  const [optionalOpen, setOptionalOpen] = useState(false);
  const isLocal = config.is_local ?? false;
  const endpointId = `${config.id}-endpoint`;
  const providerTypeId = `${config.id}-provider-type`;
  const apiKeyEnvId = `${config.id}-api-key-env`;
  const apiKeyId = `${config.id}-api-key`;
  const extraHeadersId = `${config.id}-extra-headers`;
  const extraBodyId = `${config.id}-extra-body`;
  const providerType =
    normalizeModelProviderType(config.provider_type) || "openai";
  const providerTypeOptions = useMemo<
    Array<{ value: string; label: string }>
  >(() => {
    if (
      MODEL_PROVIDER_TYPE_OPTIONS.some(
        (option) => option.value === providerType,
      )
    ) {
      return [...MODEL_PROVIDER_TYPE_OPTIONS];
    }
    return [
      { value: providerType, label: providerType },
      ...MODEL_PROVIDER_TYPE_OPTIONS,
    ];
  }, [providerType]);
  const updateField = <K extends keyof ModelProviderConfig>(
    key: K,
    value: ModelProviderConfig[K],
  ) => {
    onUpdate({ [key]: value } as Partial<ModelProviderConfig>);
  };

  return (
    <div className="space-y-4">
      <NameField
        label={translate("uxRecipestudio.connectionNamecau9z")}
        value={config.name}
        onChange={(value) => onUpdate({ name: value })}
      />

      {/* Model source toggle */}
      <div className="grid gap-1.5">
        <p className="text-sm font-semibold text-foreground">{translate("uxRecipestudio.modelSource7dhc3")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              isLocal
                ? "border-ring-strong bg-primary/5"
                : "border-border/60 bg-muted/10 hover:border-border"
            }`}
            onClick={() =>
              onUpdate({
                is_local: true,
                endpoint: "",
                api_key: "",
                api_key_env: "",
                extra_headers: "",
                extra_body: "",
              })
            }
          >
            <p className="text-sm font-semibold text-foreground">{translate("uxRecipestudio.localModelq5nfe")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {translate("uxRecipestudio.useTheModelLoaded1w4t4")}
            </p>
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              !isLocal
                ? "border-ring-strong bg-primary/5"
                : "border-border/60 bg-muted/10 hover:border-border"
            }`}
            onClick={() => onUpdate({ is_local: false })}
          >
            <p className="text-sm font-semibold text-foreground">
              {translate("uxRecipestudio.externalEndpointa5lzv")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {translate("uxRecipestudio.connectToAnAPI1l4ol")}
            </p>
          </button>
        </div>
      </div>
      {isLocal ? (
        <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{translate("uxRecipestudio.readyToGo8dqx9")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {translate("uxCopy.recipesWillUseWhatever10zv0")}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {translate("uxRecipestudio.startWithTheEndpoint14orz")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {translate("uxCopy.mostConnectionsOnlyNeed1gpc6")}
            </p>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxModelpicker.endpointb2lti")}
              htmlFor={endpointId}
              hint={translate("uxRecipestudio.baseURLForThe10t62")}
            />
            <Input
              id={endpointId}
              className="nodrag"
              placeholder="https://..."
              value={config.endpoint}
              onChange={(event) => updateField("endpoint", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.providerType1cguj")}
              htmlFor={providerTypeId}
              hint={translate("uxRecipestudio.sDKUsedForAPI343ua")}
            />
            <Select
              value={providerType}
              onValueChange={(value) => updateField("provider_type", value)}
            >
              <SelectTrigger id={providerTypeId} className="nodrag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.aPIKeyOptionalz5r6e")}
              htmlFor={apiKeyId}
              hint={translate("uxRecipestudio.pasteAKeyHerepao6w")}
            />
            <Input
              id={apiKeyId}
              className="nodrag"
              data-reload-snapshot-sensitive
              value={config.api_key ?? ""}
              onChange={(event) => updateField("api_key", event.target.value)}
            />
          </div>
          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger asChild={true}>
              <CollapsibleSectionTriggerButton
                label={translate("uxRecipestudio.advancedRequestOverridesamoix")}
                open={optionalOpen}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("uxRecipestudio.aPIKeyEnvironmentVariableas26h")}
                  htmlFor={apiKeyEnvId}
                  hint={translate("uxRecipestudio.nameOfTheEnvironmentn1q6g")}
                />
                <Input
                  id={apiKeyEnvId}
                  className="nodrag"
                  placeholder="OPENAI_API_KEY"
                  value={config.api_key_env ?? ""}
                  onChange={(event) =>
                    updateField("api_key_env", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("uxRecipestudio.extraHeadersJSON17c1d")}
                  htmlFor={extraHeadersId}
                  hint={translate("uxRecipestudio.optionalHeadersToSendagzth")}
                />
                <Textarea
                  id={extraHeadersId}
                  className="corner-squircle nodrag"
                  data-reload-snapshot-sensitive
                  placeholder='{"X-Header": "value"}'
                  value={config.extra_headers ?? ""}
                  onChange={(event) =>
                    updateField("extra_headers", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("uxRecipestudio.extraBodyJSONp9oxz")}
                  htmlFor={extraBodyId}
                  hint={translate("uxRecipestudio.optionalRequestFieldsTo14u5t")}
                />
                <Textarea
                  id={extraBodyId}
                  className="corner-squircle nodrag"
                  data-reload-snapshot-sensitive
                  placeholder='{"key": "value"}'
                  value={config.extra_body ?? ""}
                  onChange={(event) =>
                    updateField("extra_body", event.target.value)
                  }
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
