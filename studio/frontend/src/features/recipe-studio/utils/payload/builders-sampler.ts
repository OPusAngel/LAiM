// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { CategoryConditionalParams, SamplerConfig } from "../../types";
import { isValidSex, parseAgeRange, parseNumber } from "./parse";
import { translate } from "@/i18n";


const DATETIME_UNIT_MAP: Record<string, "Y" | "M" | "D" | "h" | "m" | "s"> = {
  year: "Y",
  month: "M",
  day: "D",
  hour: "h",
  minute: "m",
  second: "s",
};

function buildCategoryConditionalParams(
  config: SamplerConfig,
  errors: string[],
): Record<string, CategoryConditionalParams> | undefined {
  const conditional = config.conditional_params ?? {};
  const output: Record<string, CategoryConditionalParams> = {};
  for (const [rawCondition, params] of Object.entries(conditional)) {
    const condition = rawCondition.trim();
    if (!condition) {
      errors.push(translate("uxRecipestudio.samplerConditionalRuleNeedsruxz4", { p1: config.name }));
      continue;
    }
    const values = (params.values ?? [])
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length === 0) {
      errors.push(translate("uxRecipestudio.samplerConditionalNeedsValues9rv2k", { p1: config.name, p2: condition }));
      continue;
    }
    const weights = params.weights ?? [];
    const hasWeights = weights.some((weight) => weight !== null);
    if (
      hasWeights &&
      (weights.length !== values.length || weights.some((weight) => weight === null))
    ) {
      errors.push(translate("uxRecipestudio.samplerConditionalWeightsInvalidmsvv8", { p1: config.name, p2: condition }));
      continue;
    }
    output[condition] = {
      // biome-ignore lint/style/useNamingConvention: api schema
      sampler_type: "category",
      values,
      weights: hasWeights
        ? weights.filter((weight): weight is number => weight !== null)
        : undefined,
    };
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: per type logic
function buildSamplerParams(
  config: SamplerConfig,
  errors: string[],
): Record<string, unknown> {
  if (config.sampler_type === "category") {
    const values = config.values ?? [];
    const params: Record<string, unknown> = { values };
    const weights = config.weights ?? [];
    const hasWeights = weights.some((weight) => weight !== null);
    if (hasWeights && weights.some((weight) => weight === null)) {
      errors.push(translate("uxRecipestudio.samplerWeightsMissingValuesjk9r1", { p1: config.name }));
    } else if (hasWeights) {
      params.weights = weights.filter((weight) => weight !== null);
    }
    return params;
  }
  if (config.sampler_type === "subcategory") {
    const mapping = config.subcategory_mapping ?? {};
    for (const [key, values] of Object.entries(mapping)) {
      if (!values || values.length === 0) {
        errors.push(
          translate("uxRecipestudio.subcategoryNeedsAtLeast16esz", { p1: config.name, p2: key }),
        );
      }
    }
    return {
      category: config.subcategory_parent,
      values: mapping,
    };
  }
  if (config.sampler_type === "uniform") {
    return {
      low: parseNumber(config.low),
      high: parseNumber(config.high),
    };
  }
  if (config.sampler_type === "gaussian") {
    return {
      mean: parseNumber(config.mean),
      // data_designer expects `stddev`
      stddev: parseNumber(config.std),
    };
  }
  if (config.sampler_type === "bernoulli") {
    return {
      p: parseNumber(config.p),
    };
  }
  if (config.sampler_type === "datetime") {
    const rawUnit = config.datetime_unit?.trim();
    let unit: string | undefined = rawUnit || undefined;
    if (rawUnit && DATETIME_UNIT_MAP[rawUnit]) {
      unit = DATETIME_UNIT_MAP[rawUnit];
    }
    if (rawUnit === "week") {
      errors.push(translate("uxRecipestudio.datetimeUnitWeekNotecl3j", { p1: config.name }));
      unit = undefined;
    }
    return {
      start: config.datetime_start ?? undefined,
      end: config.datetime_end ?? undefined,
      unit,
    };
  }
  if (config.sampler_type === "timedelta") {
    return {
      // biome-ignore lint/style/useNamingConvention: api schema
      dt_min: parseNumber(config.dt_min),
      // biome-ignore lint/style/useNamingConvention: api schema
      dt_max: parseNumber(config.dt_max),
      // biome-ignore lint/style/useNamingConvention: api schema
      reference_column_name: config.reference_column_name || undefined,
      unit: config.timedelta_unit || undefined,
    };
  }
  if (config.sampler_type === "uuid") {
    const raw = config.uuid_format?.trim();
    if (!raw) {
      return {};
    }
    // UI historically used "uuid4" as a format; data_designer uuid is always uuid4.
    if (raw.toLowerCase() === "uuid4") {
      return {};
    }
    if (raw.toLowerCase() === "short" || raw.toLowerCase() === "short_form") {
      // biome-ignore lint/style/useNamingConvention: api schema
      return { short_form: true };
    }
    if (raw.toLowerCase() === "upper" || raw.toLowerCase() === "uppercase") {
      return { uppercase: true };
    }
    if (raw.toLowerCase().startsWith("prefix:")) {
      return { prefix: raw.slice("prefix:".length).trim() || undefined };
    }
    return {
      prefix: raw,
    };
  }
  const params: Record<string, unknown> = {};
  if (config.person_locale?.trim()) {
    params.locale = config.person_locale.trim();
  }
  if (config.person_sex?.trim()) {
    if (isValidSex(config.person_sex.trim())) {
      params.sex = config.person_sex.trim();
    } else {
      errors.push(translate("uxRecipestudio.personSexMustBeg2lce", { p1: config.name }));
    }
  }
  if (config.person_city?.trim()) {
    params.city = config.person_city.trim();
  }
  if (config.person_age_range?.trim()) {
    const parsed = parseAgeRange(config.person_age_range);
    if (parsed) {
      // biome-ignore lint/style/useNamingConvention: api schema
      params.age_range = parsed;
    } else {
      errors.push(translate("uxRecipestudio.personAgeRangeMust0mlir", { p1: config.name }));
    }
  }
  return params;
}

export function buildSamplerColumn(
  config: SamplerConfig,
  errors: string[],
): Record<string, unknown> {
  const samplerColumn: Record<string, unknown> = {
    // biome-ignore lint/style/useNamingConvention: api schema
    column_type: "sampler",
    name: config.name,
    drop: config.drop ?? false,
    // biome-ignore lint/style/useNamingConvention: api schema
    sampler_type: config.sampler_type,
    params: buildSamplerParams(config, errors),
    // biome-ignore lint/style/useNamingConvention: api schema
    convert_to: config.convert_to ?? undefined,
  };
  if (config.sampler_type === "category") {
    const conditionalParams = buildCategoryConditionalParams(config, errors);
    if (conditionalParams) {
      // biome-ignore lint/style/useNamingConvention: api schema
      samplerColumn.conditional_params = conditionalParams;
    }
  }
  return samplerColumn;
}
