// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReactElement } from "react";
import type { SamplerConfig } from "../../types";
import { InlineField } from "./inline-field";

type InlineSamplerProps = {
  config: SamplerConfig;
  onUpdate: (patch: Partial<SamplerConfig>) => void;
};

type ConvertTo = "int" | "float" | "str";

function ConvertToField({
  value,
  onValueChange,
}: {
  value: SamplerConfig["convert_to"];
  onValueChange: (value: ConvertTo | undefined) => void;
}): ReactElement {
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(next) =>
        onValueChange(next === "none" ? undefined : (next as ConvertTo))
      }
    >
      <SelectTrigger className="nodrag h-8 w-full text-xs">
        <SelectValue placeholder={translate("settings.apiKeys.audioApi.convert")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        <SelectItem value="int">int</SelectItem>
        <SelectItem value="float">float</SelectItem>
        <SelectItem value="str">str</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function InlineSampler({
  config,
  onUpdate,
}: InlineSamplerProps): ReactElement | null {
  if (config.sampler_type === "uniform") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <InlineField label={translate("composer.pill.effortLow")}>
          <Input
            className="nodrag h-8 w-full text-xs"
            type="number"
            placeholder="0"
            value={config.low ?? ""}
            onChange={(event) => onUpdate({ low: event.target.value })}
          />
        </InlineField>
        <InlineField label={translate("composer.pill.effortHigh")}>
          <Input
            className="nodrag h-8 w-full text-xs"
            type="number"
            placeholder="100"
            value={config.high ?? ""}
            onChange={(event) => onUpdate({ high: event.target.value })}
          />
        </InlineField>
        <InlineField label={translate("uxRecipestudio.convertTooaov5")}>
          <ConvertToField
            value={config.convert_to}
            onValueChange={(value) =>
              onUpdate({
                // biome-ignore lint/style/useNamingConvention: api schema
                convert_to: value,
              })
            }
          />
        </InlineField>
      </div>
    );
  }

  if (config.sampler_type === "gaussian") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <InlineField label={translate("uxRecipestudio.mean1lci9")}>
          <Input
            className="nodrag h-8 w-full text-xs"
            type="number"
            placeholder="0"
            value={config.mean ?? ""}
            onChange={(event) => onUpdate({ mean: event.target.value })}
          />
        </InlineField>
        <InlineField label={translate("uxRecipestudio.stdDev8y7d5")}>
          <Input
            className="nodrag h-8 w-full text-xs"
            type="number"
            placeholder="1"
            value={config.std ?? ""}
            onChange={(event) => onUpdate({ std: event.target.value })}
          />
        </InlineField>
        <InlineField label={translate("uxRecipestudio.convertTooaov5")}>
          <ConvertToField
            value={config.convert_to}
            onValueChange={(value) =>
              onUpdate({
                // biome-ignore lint/style/useNamingConvention: api schema
                convert_to: value,
              })
            }
          />
        </InlineField>
      </div>
    );
  }

  if (config.sampler_type === "bernoulli") {
    return (
      <InlineField label={translate("uxRecipestudio.probabilityP1i6ps")}>
        <Input
          className="nodrag h-8 w-full text-xs"
          type="number"
          min="0"
          max="1"
          step="0.01"
          placeholder="0.5"
          value={config.p ?? ""}
          onChange={(event) => onUpdate({ p: event.target.value })}
        />
      </InlineField>
    );
  }

  if (config.sampler_type === "uuid") {
    return (
      <InlineField label={translate("uxRecipestudio.uUIDFormat1rrjy")}>
        <Input
          className="nodrag h-8 w-full text-xs"
          placeholder={translate("uxRecipestudio.uuid4j2t9w")}
          value={config.uuid_format ?? ""}
          onChange={(event) =>
            onUpdate({
              // biome-ignore lint/style/useNamingConvention: api schema
              uuid_format: event.target.value,
            })
          }
        />
      </InlineField>
    );
  }

  return null;
}
