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

const TIMEDELTA_UNITS: Array<"D" | "h" | "m" | "s"> = ["D", "h", "m", "s"];
const NONE_VALUE = "__none";

type TimedeltaDialogProps = {
  config: SamplerConfig;
  datetimeOptions: string[];
  onUpdate: (patch: Partial<SamplerConfig>) => void;
};

export function TimedeltaDialog({
  config,
  datetimeOptions,
  onUpdate,
}: TimedeltaDialogProps): ReactElement {
  const dtMinId = `${config.id}-timedelta-min`;
  const dtMaxId = `${config.id}-timedelta-max`;
  const unitId = `${config.id}-timedelta-unit`;
  const referenceId = `${config.id}-timedelta-reference`;
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <FieldLabel
            label={translate("uxRecipestudio.dtMin14wej")}
            htmlFor={dtMinId}
            hint={translate("uxRecipestudio.minimumOffsetFromReferenceskhuc")}
          />
          <Input
            id={dtMinId}
            type="number"
            className="nodrag"
            value={config.dt_min ?? ""}
            onChange={(event) => updateField("dt_min", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel
            label={translate("uxRecipestudio.dtMaxyteq3")}
            htmlFor={dtMaxId}
            hint={translate("uxRecipestudio.maximumOffsetFromReference12tsy")}
          />
          <Input
            id={dtMaxId}
            type="number"
            className="nodrag"
            value={config.dt_max ?? ""}
            onChange={(event) => updateField("dt_max", event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <FieldLabel
          label={translate("uxRecipestudio.unitt3mdr")}
          htmlFor={unitId}
          hint={translate("uxRecipestudio.offsetUnitDH19di0")}
        />
        <Select
          value={config.timedelta_unit ?? "D"}
          onValueChange={(value) =>
            updateField("timedelta_unit", value as "D" | "h" | "m" | "s")
          }
        >
          <SelectTrigger className="nodrag w-full" id={unitId}>
            <SelectValue placeholder={translate("uxRecipestudio.selectUnit15rxz")} />
          </SelectTrigger>
          <SelectContent>
            {TIMEDELTA_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <FieldLabel
          label={translate("uxRecipestudio.referenceDatetimeColumn1n480")}
          htmlFor={referenceId}
          hint={translate("uxRecipestudio.datetimeColumnUsedAs4c6uq")}
        />
        <Select
          value={config.reference_column_name?.trim() || NONE_VALUE}
          onValueChange={(value) =>
            updateField("reference_column_name", value === NONE_VALUE ? "" : value)
          }
        >
          <SelectTrigger className="nodrag w-full" id={referenceId}>
            <SelectValue placeholder={translate("uxRecipestudio.selectDatetimeColumn1hi0x")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {datetimeOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
