// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { ExpressionConfig, RecipeProcessorConfig } from "../../types";
import { parseJsonObject } from "./parse";
import { translate } from "@/i18n";


export function buildExpressionColumn(
  config: ExpressionConfig,
  errors: string[],
): Record<string, unknown> {
  if (!config.expr.trim()) {
    errors.push(translate("uxRecipestudio.expressionExprRequired5xf57", { p1: config.name }));
  }
  return {
    // biome-ignore lint/style/useNamingConvention: api schema
    column_type: "expression",
    name: config.name,
    drop: config.drop ?? false,
    expr: config.expr,
    dtype: config.dtype,
  };
}

export function buildProcessors(
  processors: RecipeProcessorConfig[],
  errors: string[],
): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = [];
  for (const processor of processors) {
    if (processor.processor_type !== "schema_transform") {
      continue;
    }
    const name = processor.name.trim();
    if (!name) {
      errors.push(translate("uxRecipestudio.schemaTransformNameIsv9hza"));
      continue;
    }
    const template = parseJsonObject(
      processor.template,
      translate("uxRecipestudio.schemaTransformTemplateqcjqh", { p1: name }),
      errors,
    );
    if (!template) {
      continue;
    }
    output.push({
      // biome-ignore lint/style/useNamingConvention: api schema
      processor_type: "schema_transform",
      name,
      template,
    });
  }
  return output;
}
