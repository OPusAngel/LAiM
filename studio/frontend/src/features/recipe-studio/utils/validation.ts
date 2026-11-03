// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { NodeConfig } from "../types";
import { isValidSex, parseAgeRange, parseIntNumber, parseNumber } from "./parse";
import { VALIDATOR_OXC_CODE_LANGS, VALIDATOR_SQL_CODE_LANGS } from "./validators/code-lang";
import { isOxcCodeShape } from "./validators/oxc-code-shape";
import { isOxcValidationMode } from "./validators/oxc-mode";
import { translate } from "@/i18n";


const TRACE_MODES = new Set(["none", "last_message", "all_messages"]);
const GITHUB_ITEM_TYPES = new Set(["issues", "pulls", "commits"]);

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validation rules
export function getConfigErrors(config: NodeConfig | null): string[] {
  if (!config) {
    return [];
  }
  const errors: string[] = [];
  if (!config.name.trim()) {
    errors.push(translate("uxRecipestudio.nameIsRequiredklnez"));
  }
  if (config.kind === "sampler") {
    if (config.sampler_type === "category") {
      const values = config.values ?? [];
      if (values.length < 2) {
        errors.push(translate("uxRecipestudio.categoryNeedsAtLeastu74ae"));
      }
      const weights = config.weights ?? [];
      const hasWeights = weights.some((weight) => weight !== null);
      if (hasWeights && weights.some((weight) => weight === null)) {
        errors.push(translate("uxRecipestudio.weightsMustBeSet94j7s"));
      }
      for (const [condition, params] of Object.entries(
        config.conditional_params ?? {},
      )) {
        if (!condition.trim()) {
          errors.push(translate("uxRecipestudio.categoryConditionalRuleNeedsbmn5e"));
          continue;
        }
        const conditionalValues = (params.values ?? [])
          .map((value) => value.trim())
          .filter(Boolean);
        if (conditionalValues.length === 0) {
          errors.push(translate("uxRecipestudio.categoryConditionalNeedsValuesuyio9", { p1: condition }));
          continue;
        }
        const conditionalWeights = params.weights ?? [];
        const hasConditionalWeights = conditionalWeights.some(
          (weight) => weight !== null,
        );
        if (
          hasConditionalWeights &&
          (conditionalWeights.length !== conditionalValues.length ||
            conditionalWeights.some((weight) => weight === null))
        ) {
          errors.push(
            translate("uxRecipestudio.categoryConditionalWeightsMustm6fvm", { p1: condition }),
          );
        }
      }
    }
    if (config.sampler_type === "uniform") {
      const low = parseNumber(config.low);
      const high = parseNumber(config.high);
      if (low === null || high === null) {
        errors.push("Uniform low/high must be numbers.");
      } else if (low >= high) {
        errors.push("Uniform low must be < high.");
      }
    }
    if (config.sampler_type === "gaussian") {
      const mean = parseNumber(config.mean);
      const std = parseNumber(config.std);
      if (mean === null || std === null) {
        errors.push("Gaussian mean/std must be numbers.");
      } else if (std <= 0) {
        errors.push("Gaussian std must be > 0.");
      }
    }
    if (config.sampler_type === "bernoulli") {
      const p = parseNumber(config.p);
      if (p === null) {
        errors.push(translate("uxRecipestudio.bernoulliPMustBetlfi3"));
      } else if (p < 0 || p > 1) {
        errors.push(translate("uxRecipestudio.bernoulliPMustBexpv9a"));
      }
    }
    if (config.sampler_type === "datetime") {
      if (!config.datetime_unit) {
        errors.push(translate("uxRecipestudio.datetimeUnitRequired798r1"));
      }
      if (config.datetime_start && config.datetime_end) {
        const start = new Date(config.datetime_start).getTime();
        const end = new Date(config.datetime_end).getTime();
        if (!(Number.isFinite(start) && Number.isFinite(end))) {
          errors.push("Datetime start/end must be valid.");
        } else if (start >= end) {
          errors.push(translate("uxRecipestudio.datetimeStartMustBexd7f0"));
        }
      }
    }
    if (config.sampler_type === "timedelta") {
      const min = parseNumber(config.dt_min);
      const max = parseNumber(config.dt_max);
      if (min === null || max === null) {
        errors.push("Timedelta dt_min/dt_max must be numbers.");
      } else if (min >= max) {
        errors.push("Timedelta dt_min must be < dt_max.");
      }
      if (!config.reference_column_name?.trim()) {
        errors.push(translate("uxRecipestudio.timedeltaReferenceDatetimeColumn6xdn3"));
      }
      if (!config.timedelta_unit) {
        errors.push(translate("uxRecipestudio.timedeltaUnitRequired2p1pn"));
      }
    }
    if (config.sampler_type === "subcategory" && !config.subcategory_parent) {
      errors.push(translate("uxRecipestudio.subcategoryNeedsAParent473jy"));
    }
    if (
      config.sampler_type === "person" ||
      config.sampler_type === "person_from_faker"
    ) {
      if (config.person_sex?.trim()) {
        const normalized = config.person_sex.trim();
        if (!isValidSex(normalized)) {
          errors.push(translate("uxRecipestudio.personSexMustBelnede"));
        }
      }
      if (config.person_age_range?.trim()) {
        const parsed = parseAgeRange(config.person_age_range);
        if (!parsed) {
          errors.push(translate("uxRecipestudio.personAgeRangeMust5hp0r"));
        }
      }
    }
  }
  if (config.kind === "llm") {
    if (!config.model_alias.trim()) {
      errors.push(translate("uxRecipestudio.chooseASavedModelmrcxc"));
    }
    if (!config.prompt.trim()) {
      errors.push(translate("uxRecipestudio.promptIsRequired1zyy4"));
    }
    if (config.llm_type === "code" && !config.code_lang) {
      errors.push(translate("uxRecipestudio.codeLanguageIsRequireddewx4"));
    }
    if (config.llm_type === "structured") {
      if (!config.output_format?.trim()) {
        errors.push(translate("uxRecipestudio.outputFormatIsRequiredfk7js"));
      } else {
        try {
          JSON.parse(config.output_format);
        } catch {
          errors.push(translate("uxRecipestudio.outputFormatMustBe9ce8b"));
        }
      }
    }
    if (config.llm_type === "judge") {
      const scores = config.scores ?? [];
      if (scores.length === 0) {
        errors.push(translate("uxRecipestudio.addAtLeastOne5sohf"));
      }
      for (const score of scores) {
        if (!score.name.trim()) {
          errors.push(translate("uxRecipestudio.eachScoringRuleNeedsu5yk3"));
        }
        if (!score.description.trim()) {
          errors.push(translate("uxRecipestudio.eachScoringRuleNeedsjy18j"));
        }
        const options = score.options ?? [];
        if (options.length === 0) {
          errors.push(translate("uxRecipestudio.scoringRuleNeedsOptions9ijpw", { p1: score.name || "Untitled" }));
        }
        for (const option of options) {
          if (!option.value.trim() || !option.description.trim()) {
            errors.push(
              translate("uxRecipestudio.scoringRuleNeedsBothojqb0", { p1: score.name || "Untitled" }),
            );
            break;
          }
        }
      }
    }
    if (config.image_context?.enabled) {
      if (!config.image_context.column_name.trim()) {
        errors.push(translate("uxRecipestudio.imageContextColumnIs1bj1d"));
      }
    }
    if (
      config.with_trace &&
      !TRACE_MODES.has(config.with_trace)
    ) {
      errors.push(translate("uxRecipestudio.traceModeMustBe4thq4"));
    }
  }
  if (config.kind === "expression") {
    if (!config.expr.trim()) {
      errors.push(translate("uxRecipestudio.expressionIsRequirednbul5"));
    }
  }
  if (config.kind === "tool_config") {
    if (config.mcp_providers.length === 0) {
      errors.push(translate("uxRecipestudio.addAtLeastOne4ctmr"));
    }
    const serverNames = new Set<string>();
    for (const provider of config.mcp_providers) {
      const name = provider.name.trim();
      if (!name) {
        errors.push(translate("uxRecipestudio.eachToolServerNeedskprww"));
        continue;
      }
      if (serverNames.has(name)) {
        errors.push(`Tool server names must be unique: ${name}.`);
      }
      serverNames.add(name);
      if (provider.provider_type === "stdio") {
        if (!provider.command?.trim()) {
          errors.push(translate("uxRecipestudio.toolServerAddAen8sw", { p1: name }));
        }
      } else if (!provider.endpoint?.trim()) {
        errors.push(translate("uxRecipestudio.toolServerAddAnssq1l", { p1: name }));
      }
    }
    const maxTurnsRaw = config.max_tool_call_turns?.trim();
    if (
      maxTurnsRaw &&
      (!Number.isFinite(Number(maxTurnsRaw)) || Number(maxTurnsRaw) < 1)
    ) {
      errors.push(translate("uxRecipestudio.maxToolUseTurns1v6qh"));
    }
    const timeoutRaw = config.timeout_sec?.trim();
    if (
      timeoutRaw &&
      (!Number.isFinite(Number(timeoutRaw)) || Number(timeoutRaw) <= 0)
    ) {
      errors.push("Timeout must be > 0.");
    }
  }
  if (config.kind === "validator") {
    const targets = (config.target_columns ?? [])
      .map((value) => value.trim())
      .filter(Boolean);
    if (targets.length === 0) {
      errors.push(translate("uxRecipestudio.chooseTheFieldTojd5m5"));
    }
    const batch = parseIntNumber(config.batch_size);
    if (batch === null || batch < 1) {
      errors.push("Batch size must be an integer >= 1.");
    }
    if (config.validator_type === "json" || config.validator_type === "markdown") {
      return errors;
    }
    if (!config.code_lang.trim()) {
      errors.push(translate("uxRecipestudio.chooseACodeLanguage9uhf5"));
    } else if (config.validator_type === "oxc") {
      if (!VALIDATOR_OXC_CODE_LANGS.includes(config.code_lang)) {
        errors.push("This JS/TS check only supports JavaScript or TypeScript.");
      }
      if (!isOxcValidationMode(config.oxc_validation_mode)) {
        errors.push(translate("uxRecipestudio.chooseWhetherToCheckqvl5q"));
      }
      if (!isOxcCodeShape(config.oxc_code_shape)) {
        errors.push(translate("uxRecipestudio.chooseWhetherThisCode9xw19"));
      }
    } else if (
      config.code_lang !== "python" &&
      !VALIDATOR_SQL_CODE_LANGS.includes(config.code_lang)
    ) {
      errors.push(translate("uxRecipestudio.thisCheckSupportsPython0llna"));
    }
  }
  if (config.kind === "seed") {
    const seedSourceType = config.seed_source_type ?? "hf";
    if (seedSourceType === "github_repo") {
      const repos = (config.github_repo_slug ?? "")
        .split(/[\n,]/)
        .map((repo) => repo.trim())
        .filter(Boolean);
      if (repos.length === 0) {
        errors.push(translate("uxRecipestudio.addAtLeastOney5zbm"));
      }
      if (
        repos.some((repo) => {
          const parts = repo.split("/");
          return parts.length !== 2 || parts.some((part) => !part);
        })
      ) {
        errors.push("GitHub repositories must use owner/name format.");
      }
      const itemTypes = config.github_item_types?.length
        ? config.github_item_types
        : ["issues", "pulls"];
      if (itemTypes.length === 0) {
        errors.push(translate("uxRecipestudio.chooseAtLeastOne6ovs8"));
      } else if (itemTypes.some((itemType) => !GITHUB_ITEM_TYPES.has(itemType))) {
        errors.push(translate("uxRecipestudio.gitHubItemTypesMustx7c1r"));
      }
      const limit = parseIntNumber(config.github_limit ?? "100");
      if (limit === null || limit < 1 || limit > 5000) {
        errors.push(translate("uxRecipestudio.itemsPerRepoMustcyemv"));
      }
      const maxComments = parseIntNumber(config.github_max_comments_per_item ?? "30");
      if (maxComments === null || maxComments < 0 || maxComments > 200) {
        errors.push(translate("uxRecipestudio.maxCommentsPerItemmico3"));
      }
    } else if (seedSourceType === "hf" && !config.hf_repo_id.trim()) {
      errors.push(translate("uxRecipestudio.chooseAHuggingFacebdbff"));
    }
    if (seedSourceType !== "github_repo") {
      const hasPath =
        seedSourceType === "unstructured"
          ? (config.resolved_paths?.length ?? 0) > 0
          : Boolean(config.hf_path.trim());
      if (!hasPath) {
        errors.push(translate("uxRecipestudio.loadTheSourceData17g23"));
      }
    }
    if (
      seedSourceType === "hf" &&
      config.hf_endpoint?.trim() &&
      !config.hf_endpoint.trim().startsWith("http")
    ) {
      errors.push(translate("uxRecipestudio.hFEndpointMustStarte5n86"));
    }
    if (seedSourceType === "unstructured") {
      if (config.drop && (config.seed_columns?.length ?? 0) === 0) {
        errors.push(translate("uxRecipestudio.loadTheAvailableFieldskk4fb"));
      }
      const chunkSizeRaw = Number(config.unstructured_chunk_size);
      const chunkOverlapRaw = Number(config.unstructured_chunk_overlap);
      if (!Number.isFinite(chunkSizeRaw) || Math.floor(chunkSizeRaw) < 1) {
        errors.push("Chunk size must be an integer >= 1.");
      }
      if (!Number.isFinite(chunkOverlapRaw) || Math.floor(chunkOverlapRaw) < 0) {
        errors.push("Chunk overlap must be an integer >= 0.");
      }
      if (
        Number.isFinite(chunkSizeRaw) &&
        Number.isFinite(chunkOverlapRaw) &&
        Math.floor(chunkOverlapRaw) >= Math.floor(chunkSizeRaw)
      ) {
        errors.push(translate("uxRecipestudio.chunkOverlapMustBee7mch"));
      }
    } else if (seedSourceType !== "github_repo") {
      const selectedDropColumns = (config.seed_drop_columns ?? [])
        .map((value) => value.trim())
        .filter(Boolean);
      if (selectedDropColumns.length > 0 && (config.seed_columns?.length ?? 0) === 0) {
        errors.push(translate("uxRecipestudio.loadTheAvailableFieldskk4fb"));
      }
    }

    if (config.selection_type === "index_range") {
      const start = parseIntNumber(config.selection_start);
      const end = parseIntNumber(config.selection_end);
      if (start === null || end === null) {
        errors.push("Index range start/end must be integers.");
      } else {
        if (start < 0 || end < 0) {
          errors.push("Index range start/end must be >= 0.");
        }
        if (end < start) {
          errors.push("Index range end must be >= start.");
        }
      }
    }
    if (config.selection_type === "partition_block") {
      const index = parseIntNumber(config.selection_index);
      const parts = parseIntNumber(config.selection_num_partitions);
      if (index === null || parts === null) {
        errors.push("Partition index/num_partitions must be integers.");
      } else {
        if (index < 0) errors.push("Partition index must be >= 0.");
        if (parts < 1) errors.push("Partition num_partitions must be >= 1.");
        if (parts >= 1 && index >= parts) {
          errors.push("Partition index must be < num_partitions.");
        }
      }
    }
  }
  return errors;
}
