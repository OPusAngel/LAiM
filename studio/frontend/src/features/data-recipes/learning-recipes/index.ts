// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { RecipePayload } from "@/features/recipe-studio";

const structuredOutputsJinjaUrl = new URL(
  "./structured-outputs-jinja.json",
  import.meta.url,
).href;
const pdfGroundedQaUrl = new URL("./pdf-grounded-qa.json", import.meta.url)
  .href;
const instructionFromAnswerUrl = new URL(
  "./instruction-from-answer.json",
  import.meta.url,
).href;
const textToPythonUrl = new URL("./text-to-python.json", import.meta.url).href;
const textToSqlUrl = new URL("./text-to-sql.json", import.meta.url).href;
const ocrDocumentExtractionUrl = new URL(
  "./ocr-document-extraction.json",
  import.meta.url,
).href;
const githubSupportBotUrl = new URL(
  "./github-support-bot.json",
  import.meta.url,
).href;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> =>
    isRecord(item),
  );
}

function coerceRecipePayload(value: unknown): RecipePayload {
  if (!isRecord(value)) {
    throw new Error(translate("uxDatarecipes.templatePayloadIsInvalidhmhei"));
  }

  const recipeSource = isRecord(value.recipe) ? value.recipe : value;
  if (!Array.isArray(recipeSource.columns)) {
    throw new Error(translate("uxDatarecipes.templatePayloadMustInclude217eu"));
  }

  if (isRecord(value.recipe) && isRecord(value.run) && isRecord(value.ui)) {
    return value as unknown as RecipePayload;
  }

  const recipe: RecipePayload["recipe"] = {
    // biome-ignore lint/style/useNamingConvention: api schema
    model_providers: toRecordArray(recipeSource.model_providers),
    // biome-ignore lint/style/useNamingConvention: api schema
    mcp_providers: toRecordArray(recipeSource.mcp_providers),
    // biome-ignore lint/style/useNamingConvention: api schema
    model_configs: toRecordArray(recipeSource.model_configs),
    // biome-ignore lint/style/useNamingConvention: api schema
    seed_config: isRecord(recipeSource.seed_config)
      ? recipeSource.seed_config
      : undefined,
    // biome-ignore lint/style/useNamingConvention: api schema
    tool_configs: toRecordArray(recipeSource.tool_configs),
    columns: toRecordArray(recipeSource.columns),
    processors: toRecordArray(recipeSource.processors),
  };

  return {
    recipe,
    run: {
      rows: 5,
      preview: true,
      // biome-ignore lint/style/useNamingConvention: api schema
      output_formats: ["jsonl"],
    },
    ui: {
      nodes: [],
      edges: [],
    },
  };
}

async function loadPayloadFromUrl(url: string): Promise<RecipePayload> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(translate("uxDatarecipes.failedToFetchTemplateihmpi", { p1: response.status }));
  }
  const json = (await response.json()) as unknown;
  return coerceRecipePayload(json);
}

export type LearningRecipeDef = {
  id: string;
  title: string;
  description: string;
  loadPayload: () => Promise<RecipePayload>;
};

export const LEARNING_RECIPES: LearningRecipeDef[] = [
  {
    id: "structured-outputs-jinja",
    get title() {
      return translate("uxDatarecipes.structuredOutputsJinjaExpressions1ufow");
    },
    get description() {
      return translate("uxDatarecipes.supportTicketTriageWithxwkfv");
    },
    loadPayload: () => loadPayloadFromUrl(structuredOutputsJinjaUrl),
  },
  {
    id: "pdf-grounded-qa",
    get title() {
      return translate("uxDatarecipes.pDFDocumentQA9izwn");
    },
    get description() {
      return translate("uxDatarecipes.buildGroundedQuestionAnswer12082");
    },
    loadPayload: () => loadPayloadFromUrl(pdfGroundedQaUrl),
  },
  {
    id: "instruction-from-answer",
    get title() {
      return translate("uxDatarecipes.instructionFromAnswerj87cy");
    },
    get description() {
      return translate("uxDatarecipes.useSeedAnswerColumns9jbqc");
    },
    loadPayload: () => loadPayloadFromUrl(instructionFromAnswerUrl),
  },
  {
    id: "text-to-python",
    get title() {
      return translate("uxDatarecipes.textToPythonxop2l");
    },
    get description() {
      return translate("uxDatarecipes.generateInstructionToCodel39su");
    },
    loadPayload: () => loadPayloadFromUrl(textToPythonUrl),
  },
  {
    id: "text-to-sql",
    get title() {
      return translate("uxDatarecipes.textToSQL17sot");
    },
    get description() {
      return translate("uxDatarecipes.generateSQLTasksAnd1v4yq");
    },
    loadPayload: () => loadPayloadFromUrl(textToSqlUrl),
  },
  {
    id: "ocr-document-extraction",
    get title() {
      return translate("uxDatarecipes.oCRDocumentExtractionlje21");
    },
    get description() {
      return translate("uxDatarecipes.useImageContextToks6mx");
    },
    loadPayload: () => loadPayloadFromUrl(ocrDocumentExtractionUrl),
  },
  {
    id: "github-support-bot",
    get title() {
      return translate("uxDatarecipes.gitHubCrawler1xwz9");
    },
    description:
      "Crawl real GitHub issues and PRs and turn each thread into a {User, Assistant} training pair.",
    loadPayload: () => loadPayloadFromUrl(githubSupportBotUrl),
  },
];
