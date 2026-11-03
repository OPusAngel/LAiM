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
import { NameField } from "../shared/name-field";
import { FieldLabel } from "../shared/field-label";

type GaussianDialogProps = {
  config: SamplerConfig;
  onUpdate: (patch: Partial<SamplerConfig>) => void;
};

export function GaussianDialog({
  config,
  onUpdate,
}: GaussianDialogProps): ReactElement {
  const meanId = `${config.id}-gaussian-mean`;
  const stdId = `${config.id}-gaussian-std`;
  const convertId = `${config.id}-gaussian-convert`;
  return (
    <div className="space-y-4">
      <NameField
        value={config.name}
        onChange={(value) => onUpdate({ name: value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <FieldLabel
            label={translate("uxRecipestudio.mean1lci9")}
            htmlFor={meanId}
            hint={translate("uxRecipestudio.centerOfTheNormaldjvfg")}
          />
          <Input
            id={meanId}
            type="number"
            className="nodrag"
            value={config.mean ?? ""}
            onChange={(event) => onUpdate({ mean: event.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel
            label={translate("uxRecipestudio.std7g2j5")}
            htmlFor={stdId}
            hint={translate("uxRecipestudio.standardDeviationMustBegi90t")}
          />
          <Input
            id={stdId}
            type="number"
            className="nodrag"
            value={config.std ?? ""}
            onChange={(event) => onUpdate({ std: event.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <FieldLabel
          label={translate("uxRecipestudio.convertTooaov5")}
          htmlFor={convertId}
          hint={translate("uxRecipestudio.optionallyCastSampledValuestvgyy")}
        />
        <Select
          value={config.convert_to ?? "none"}
          onValueChange={(value) =>
            onUpdate({
              // biome-ignore lint/style/useNamingConvention: api schema
              convert_to: value === "none" ? undefined : (value as "int" | "float" | "str"),
            })
          }
        >
          <SelectTrigger className="nodrag w-full" id={convertId}>
            <SelectValue placeholder={translate("uxRecipestudio.noConversion838oh")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="int">int</SelectItem>
            <SelectItem value="float">float</SelectItem>
            <SelectItem value="str">str</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
