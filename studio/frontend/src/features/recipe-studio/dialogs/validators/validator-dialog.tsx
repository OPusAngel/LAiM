// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ReactElement, useMemo, useRef } from "react";
import { useRecipeStudioStore } from "../../stores/recipe-studio";
import type { ValidatorConfig } from "../../types";
import {
  isValidatorCodeLang,
  VALIDATOR_OXC_CODE_LANGS,
  VALIDATOR_SQL_CODE_LANGS,
} from "../../utils/validators/code-lang";
import {
  OXC_CODE_SHAPES,
  normalizeOxcCodeShape,
} from "../../utils/validators/oxc-code-shape";
import {
  OXC_VALIDATION_MODES,
  normalizeOxcValidationMode,
} from "../../utils/validators/oxc-mode";
import { CollapsibleSectionTriggerButton } from "../shared/collapsible-section-trigger";
import { FieldLabel } from "../shared/field-label";
import { NameField } from "../shared/name-field";

type ValidatorDialogProps = {
  config: ValidatorConfig;
  onUpdate: (patch: Partial<ValidatorConfig>) => void;
};

const NONE_VALUE = "__none__";

export function ValidatorDialog({
  config,
  onUpdate,
}: ValidatorDialogProps): ReactElement {
  const configs = useRecipeStudioStore((state) => state.configs);
  const targetColumnId = `${config.id}-target-column`;
  const oxcModeId = `${config.id}-oxc-mode`;
  const oxcCodeShapeId = `${config.id}-oxc-code-shape`;
  const batchSizeId = `${config.id}-batch-size`;
  const oxcModeAnchorRef = useRef<HTMLDivElement>(null);
  const oxcCodeShapeAnchorRef = useRef<HTMLDivElement>(null);
  const advancedOpen = config.advancedOpen === true;
  const selectedOxcMode = normalizeOxcValidationMode(config.oxc_validation_mode);
  const selectedOxcCodeShape = normalizeOxcCodeShape(config.oxc_code_shape);
  const targetOptions = useMemo(
    () =>
      Object.values(configs)
        .flatMap((item) => {
          if (config.validator_type === "json" || config.validator_type === "markdown") {
            if (
              item.kind === "llm" ||
              item.kind === "expression" ||
              item.kind === "sampler"
            ) {
              return [{ name: item.name, codeLang: config.code_lang }];
            }
            return [];
          }
          if (!(item.kind === "llm" && item.llm_type === "code")) {
            return [];
          }
          if (config.validator_type === "oxc") {
            const lang = item.code_lang?.trim() ?? "";
            if (!VALIDATOR_OXC_CODE_LANGS.includes(lang as typeof config.code_lang)) {
              return [];
            }
          } else {
            const lang = item.code_lang?.trim() ?? "";
            if (
              !(
                lang === "python" ||
                VALIDATOR_SQL_CODE_LANGS.includes(lang as typeof config.code_lang)
              )
            ) {
              return [];
            }
          }
          return [
            {
              name: item.name,
              codeLang: item.code_lang?.trim() ?? "",
            },
          ];
        })
        .filter((item) => item.name.trim())
        .sort((a, b) => a.name.localeCompare(b.name)),
    [config.code_lang, config.validator_type, configs],
  );
  const currentTarget = config.target_columns[0] ?? "";

  return (
    <div className="space-y-4">
      <NameField
        label={translate("uxRecipestudio.checkNamev9vja")}
        hint={translate("uxRecipestudio.nameUsedForThisk66e9")}
        value={config.name}
        onChange={(value) => onUpdate({ name: value })}
      />
      <div className="grid gap-1.5">
        <FieldLabel
          label={config.validator_type === "json" || config.validator_type === "markdown"
            ? translate("uxRecipestudio.fieldToCheck8hp3z")
            : translate("uxRecipestudio.codeToCheckkk4m1")}
          htmlFor={targetColumnId}
          hint={
            config.validator_type === "json"
              ? translate("uxRecipestudio.chooseTheColumnThat81uqu")
              : config.validator_type === "markdown"
                ? translate("uxRecipestudio.chooseTheColumnThatan9uw")
                : translate("uxRecipestudio.chooseTheAICode79oqe")
          }
        />
        <Select
          value={currentTarget || NONE_VALUE}
          onValueChange={(value) => {
            if (value === NONE_VALUE) {
              onUpdate({
                // biome-ignore lint/style/useNamingConvention: api schema
                target_columns: [],
              });
              return;
            }
            const targetConfig = targetOptions.find((item) => item.name === value);
            const nextCodeLang = targetConfig?.codeLang?.trim();
            onUpdate({
              // biome-ignore lint/style/useNamingConvention: api schema
              target_columns: [value],
              // biome-ignore lint/style/useNamingConvention: api schema
              code_lang:
                nextCodeLang && isValidatorCodeLang(nextCodeLang)
                  ? nextCodeLang
                  : config.code_lang,
            });
          }}
        >
          <SelectTrigger className="nodrag w-full" id={targetColumnId}>
            <SelectValue placeholder={translate("uxRecipestudio.selectCodeColumn10x1p")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {targetOptions.map((item) => (
              <SelectItem key={item.name} value={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {targetOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {config.validator_type === "json"
                  ? translate("uxRecipestudio.addAGenerationStepui770")
                  : config.validator_type === "markdown"
                    ? translate("uxRecipestudio.addAGenerationStep21n43")
                    : config.validator_type === "oxc"
                  ? translate("uxRecipestudio.addAnAICode96ydy")
                  : translate("uxRecipestudio.addAnAICode5dhzu")}
              </p>
        )}
      </div>
      {config.validator_type === "oxc" && (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.checkMode1lovl")}
              htmlFor={oxcModeId}
              hint={translate("uxRecipestudio.chooseWhetherToCheckmwvan")}
            />
            <div ref={oxcModeAnchorRef}>
              <Combobox
                items={OXC_VALIDATION_MODES}
                filteredItems={OXC_VALIDATION_MODES}
                filter={null}
                value={selectedOxcMode}
                onValueChange={(value) =>
                  onUpdate({
                    oxc_validation_mode: normalizeOxcValidationMode(value),
                  })
                }
                itemToStringValue={(value) => value}
                autoHighlight={true}
              >
                <ComboboxInput
                  id={oxcModeId}
                  className="nodrag w-full"
                  placeholder={translate("uxRecipestudio.selectValidationModepe65c")}
                  readOnly={true}
                />
                <ComboboxContent anchor={oxcModeAnchorRef}>
                  <ComboboxEmpty>{translate("uxCopy.noModesAvailabletemj7")}</ComboboxEmpty>
                  <ComboboxList>
                    {(mode: string) => (
                      <ComboboxItem key={mode} value={mode}>
                        {mode}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.codeShape1h7zn")}
              htmlFor={oxcCodeShapeId}
              hint={translate("uxRecipestudio.chooseWhetherTheCoden9n05")}
            />
            <div ref={oxcCodeShapeAnchorRef}>
              <Combobox
                items={OXC_CODE_SHAPES}
                filteredItems={OXC_CODE_SHAPES}
                filter={null}
                value={selectedOxcCodeShape}
                onValueChange={(value) =>
                  onUpdate({
                    oxc_code_shape: normalizeOxcCodeShape(value),
                  })
                }
                itemToStringValue={(value) => value}
                autoHighlight={true}
              >
                <ComboboxInput
                  id={oxcCodeShapeId}
                  className="nodrag w-full"
                  placeholder={translate("uxRecipestudio.selectCodeShapeeybug")}
                  readOnly={true}
                />
                <ComboboxContent anchor={oxcCodeShapeAnchorRef}>
                  <ComboboxEmpty>{translate("uxRecipestudio.noCodeShapeOptionstl8tj")}</ComboboxEmpty>
                  <ComboboxList>
                    {(shape: string) => (
                      <ComboboxItem key={shape} value={shape}>
                        {shape}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
        </div>
      )}
      <Collapsible
        open={advancedOpen}
        onOpenChange={(open) => onUpdate({ advancedOpen: open })}
      >
        <CollapsibleTrigger asChild={true}>
          <CollapsibleSectionTriggerButton
            label={translate("uxRecipestudio.advancedCheckSettings8b22f")}
            open={advancedOpen}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("studio.progress.batchSize")}
              htmlFor={batchSizeId}
              hint={translate("uxRecipestudio.howManyRecordsTowkwq3")}
            />
            <Input
              id={batchSizeId}
              className="nodrag"
              value={config.batch_size}
              onChange={(event) => onUpdate({ batch_size: event.target.value })}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
