// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type {
  ExpressionDtype,
  LlmType,
  SamplerType,
} from "../types";
import { translate } from "@/i18n";


const SAMPLER_LABELS: Record<SamplerType, string> = {
  get category() { return translate("uxRecipestudio.category1cr1m"); },
  get subcategory() { return translate("uxRecipestudio.subcategory1ut5b"); },
  get uniform() { return translate("uxRecipestudio.randomNumber55303"); },
  get gaussian() { return translate("uxRecipestudio.bellCurveNumber7oiq7"); },
  get bernoulli() { return translate("uxRecipestudio.yesNoValue5dlmq"); },
  get datetime() { return translate("uxRecipestudio.dateAndTimexzc0q"); },
  get timedelta() { return translate("uxRecipestudio.timeOffset159xs"); },
  get uuid() { return translate("uxRecipestudio.uniqueID1e6mu"); },
  get person() { return translate("uxRecipestudio.syntheticPerson135dc"); },
  get person_from_faker() { return translate("uxRecipestudio.syntheticPerson135dc"); },
};

const LLM_LABELS: Record<LlmType, string> = {
  get text() { return translate("uxRecipestudio.aITextzzmie"); },
  get structured() { return translate("uxRecipestudio.aIStructuredDatauqkn6"); },
  get code() { return translate("uxRecipestudio.aICode1xoyz"); },
  get judge() { return translate("uxRecipestudio.aIScorer1yvmy"); },
};

const EXPRESSION_LABELS: Record<ExpressionDtype, string> = {
  str: "Text",
  int: "Int",
  float: "Float",
  bool: "Bool",
};

export function labelForSampler(type: SamplerType): string {
  return SAMPLER_LABELS[type] ?? translate("uxRecipestudio.generatedFieldtlx6w");
}

export function labelForLlm(type: LlmType): string {
  return LLM_LABELS[type] ?? "AI";
}

export function labelForExpression(type: ExpressionDtype): string {
  return EXPRESSION_LABELS[type] ?? translate("uxRecipestudio.formula1b8ag");
}
