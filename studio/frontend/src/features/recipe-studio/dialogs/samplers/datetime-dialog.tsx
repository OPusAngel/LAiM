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

const DATETIME_UNITS = [
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
];

type DatetimeDialogProps = {
  config: SamplerConfig;
  onUpdate: (patch: Partial<SamplerConfig>) => void;
};

export function DatetimeDialog({
  config,
  onUpdate,
}: DatetimeDialogProps): ReactElement {
  const startId = `${config.id}-datetime-start`;
  const endId = `${config.id}-datetime-end`;
  const unitId = `${config.id}-datetime-unit`;
  const updateField = <K extends keyof SamplerConfig>(
    key: K,
    value: SamplerConfig[K],
  ) => {
    onUpdate({ [key]: value } as Partial<SamplerConfig>);
  };
  return (
    <div className="space-y-4">
      <NameField
        value={config.name}
        onChange={(value) => onUpdate({ name: value })}
      />
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.start30xvg")}
              htmlFor={startId}
              hint={translate("uxRecipestudio.earliestDatetimeAllowed1hlw5")}
            />
            <Input
              id={startId}
              type="datetime-local"
              className="nodrag"
              value={config.datetime_start ?? ""}
              onChange={(event) =>
                updateField("datetime_start", event.target.value)
              }
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("studio.dataset.endPlaceholder")}
              htmlFor={endId}
              hint={translate("uxRecipestudio.latestDatetimeAllowedgrdc9")}
            />
            <Input
              id={endId}
              type="datetime-local"
              className="nodrag"
              value={config.datetime_end ?? ""}
              onChange={(event) =>
                updateField("datetime_end", event.target.value)
              }
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <FieldLabel
            label={translate("uxRecipestudio.unitt3mdr")}
            htmlFor={unitId}
            hint={translate("uxRecipestudio.samplingGranularityForGeneratedal701")}
          />
          <Select
            value={config.datetime_unit ?? ""}
            onValueChange={(value) => updateField("datetime_unit", value)}
          >
            <SelectTrigger className="nodrag w-full" id={unitId}>
              <SelectValue placeholder={translate("uxRecipestudio.selectUnit15rxz")} />
            </SelectTrigger>
            <SelectContent>
              {DATETIME_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
