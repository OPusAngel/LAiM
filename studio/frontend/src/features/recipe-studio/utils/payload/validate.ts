// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type {
  ModelConfig,
  ModelProviderConfig,
  NodeConfig,
  ValidatorCodeLang,
  ValidatorConfig,
} from "../../types";
import {
  isSupportedModelProviderType,
  normalizeModelProviderType,
} from "../model-provider-types";
import { VALIDATOR_OXC_CODE_LANGS } from "../validators/code-lang";
import { isOxcCodeShape } from "../validators/oxc-code-shape";
import { isOxcValidationMode } from "../validators/oxc-mode";
import { translate } from "@/i18n";


export function validateSubcategoryConfigs(
  configs: Record<string, NodeConfig>,
  nameToConfig: Map<string, NodeConfig>,
  errors: string[],
): void {
  for (const config of Object.values(configs)) {
    if (config.kind !== "sampler" || config.sampler_type !== "subcategory") {
      continue;
    }
    const parentName = config.subcategory_parent;
    if (!parentName) {
      errors.push(translate("uxRecipestudio.subcategoryParentCategoryRequiret9wll", { p1: config.name }));
      continue;
    }
    const parent = nameToConfig.get(parentName);
    const parentValues =
      parent && parent.kind === "sampler" && parent.sampler_type === "category"
        ? (parent.values ?? [])
        : [];
    const mapping = config.subcategory_mapping ?? {};
    for (const value of parentValues) {
      const list = mapping[value];
      if (!list || list.length === 0) {
        errors.push(
          translate("uxRecipestudio.subcategoryNeedsAtLeast16esz", { p1: config.name, p2: value }),
        );
      }
    }
  }
}

export function validateTimedeltaConfigs(
  configs: Record<string, NodeConfig>,
  nameToConfig: Map<string, NodeConfig>,
  errors: string[],
): void {
  for (const config of Object.values(configs)) {
    if (config.kind !== "sampler" || config.sampler_type !== "timedelta") {
      continue;
    }
    const reference = config.reference_column_name?.trim() ?? "";
    if (!reference) {
      errors.push(
        translate("uxRecipestudio.timedeltaReferenceDatetimeColumn9inwx", { p1: config.name }),
      );
      continue;
    }
    const parent = nameToConfig.get(reference);
    if (
      !parent ||
      parent.kind !== "sampler" ||
      parent.sampler_type !== "datetime"
    ) {
      errors.push(
        translate("uxRecipestudio.timedeltaReferenceMustBejdcp8", { p1: config.name, p2: reference }),
      );
    }
  }
}

export function validateModelAliasLinks(
  modelAliases: Set<string>,
  modelConfigConfigs: ModelConfig[],
  errors: string[],
): void {
  for (const alias of modelAliases) {
    if (!modelConfigConfigs.some((config) => config.name === alias)) {
      errors.push(translate("uxRecipestudio.lLMModelAliasMissing8lu2h", { p1: alias }));
    }
  }
}

export function validateModelConfigProviders(
  modelConfigConfigs: ModelConfig[],
  modelAliases: Set<string>,
  modelProviderNames: Set<string>,
  localProviderNames: Set<string>,
  errors: string[],
): void {
  for (const config of modelConfigConfigs) {
    const provider = config.provider.trim();
    const alias = config.name;
    const isLocal = localProviderNames.has(provider);
    const isUsed = modelAliases.has(alias);
    const model = config.model.trim();
    const isLegacyLocalPlaceholder = model.toLowerCase() === "local";

    if (!isLocal && isUsed && isLegacyLocalPlaceholder) {
      errors.push(translate("uxRecipestudio.modelConfigModelIsmnk8h", { p1: alias }));
      continue;
    }
    if (isLocal && isUsed && !model) {
      errors.push(translate("uxRecipestudio.modelConfigChooseAfizoj", { p1: alias }));
    }
    if (!isLocal && isUsed && !model) {
      errors.push(translate("uxRecipestudio.modelConfigModelIsmnk8h", { p1: alias }));
    }
    if (provider && !modelProviderNames.has(provider)) {
      errors.push(translate("uxRecipestudio.modelConfigProviderNotsutbw", { p1: alias, p2: provider }));
    }
  }
}

export function validateUsedProviders(
  modelProviderConfigs: ModelProviderConfig[],
  modelConfigConfigs: ModelConfig[],
  errors: string[],
): void {
  const usedProviders = new Set(
    modelConfigConfigs.map((config) => config.provider.trim()).filter(Boolean),
  );
  for (const provider of modelProviderConfigs) {
    if (!usedProviders.has(provider.name)) {
      continue;
    }
    if (provider.is_local) {
      continue;
    }
    if (!provider.endpoint.trim()) {
      errors.push(translate("uxRecipestudio.modelProviderEndpointIsmuycf", { p1: provider.name }));
    }
    const providerType =
      normalizeModelProviderType(provider.provider_type) || "openai";
    if (!isSupportedModelProviderType(providerType)) {
      errors.push(
        translate("uxRecipestudio.modelProviderProviderType2mzf1", { p1: provider.name, p2: providerType }),
      );
    }
  }
}

export function validateValidatorConfigs(
  configs: Record<string, NodeConfig>,
  nameToConfig: Map<string, NodeConfig>,
  errors: string[],
): void {
  for (const config of Object.values(configs)) {
    if (config.kind !== "validator") {
      continue;
    }
    const target = (config as ValidatorConfig).target_columns[0]?.trim();
    if (!target) {
      continue;
    }
    const targetConfig = nameToConfig.get(target);
    if (!targetConfig) {
      errors.push(translate("uxRecipestudio.validatorTargetNotFoundqzo7i", { p1: config.name, p2: target }));
      continue;
    }
    if (
      config.validator_type === "json" ||
      config.validator_type === "markdown"
    ) {
      if (
        targetConfig.kind !== "llm" &&
        targetConfig.kind !== "expression" &&
        targetConfig.kind !== "sampler"
      ) {
        errors.push(
          translate("uxRecipestudio.validatorTargetMustBel7h6g", { p1: config.name, p2: target }),
        );
      }
      continue;
    }
    if (targetConfig.kind !== "llm" || targetConfig.llm_type !== "code") {
      errors.push(
        translate("uxRecipestudio.validatorTargetMustBehtsvc", { p1: config.name, p2: target }),
      );
      continue;
    }
    if (
      config.validator_type === "oxc" &&
      !VALIDATOR_OXC_CODE_LANGS.includes(
        (targetConfig.code_lang ?? "").trim() as ValidatorCodeLang,
      )
    ) {
      errors.push(
        `Validator ${config.name}: target '${target}' must use javascript/typescript/jsx/tsx.`,
      );
      continue;
    }
    if (
      config.validator_type === "oxc" &&
      !isOxcValidationMode(config.oxc_validation_mode)
    ) {
      errors.push(
        translate("uxRecipestudio.validatorOxcValidationModepp506", { p1: config.name, p2: config.oxc_validation_mode }),
      );
      continue;
    }
    if (
      config.validator_type === "oxc" &&
      !isOxcCodeShape(config.oxc_code_shape)
    ) {
      errors.push(
        translate("uxRecipestudio.validatorOxcCodeShapej0qkb", { p1: config.name, p2: config.oxc_code_shape }),
      );
      continue;
    }
    if (
      config.validator_type !== "oxc" &&
      (targetConfig.code_lang ?? "").trim() !== config.code_lang.trim()
    ) {
      errors.push(
        translate("uxRecipestudio.validatorCodeLangMusti2q93", { p1: config.name, p2: config.code_lang, p3: target, p4: targetConfig.code_lang ?? "unknown" }),
      );
    }
  }
}
