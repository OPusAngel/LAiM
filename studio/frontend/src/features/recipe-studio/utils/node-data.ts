// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { RecipeNodeData, LayoutDirection, NodeConfig } from "../types";
import {
  labelForExpression,
  labelForLlm,
  labelForSampler,
} from "./config-labels";

export function nodeDataFromConfig(
  config: NodeConfig,
  layoutDirection: LayoutDirection = "LR",
): RecipeNodeData {
  if (config.kind === "sampler") {
    return {
      title: translate("uxRecipestudio.generatedFieldj4m2e"),
      kind: "sampler",
      subtype: labelForSampler(config.sampler_type),
      blockType: config.sampler_type,
      name: config.name,
      layoutDirection,
    };
  }
  if (config.kind === "expression") {
    return {
      title: translate("uxRecipestudio.formula1b8ag"),
      kind: "expression",
      subtype: labelForExpression(config.dtype),
      blockType: "expression",
      name: config.name,
      layoutDirection,
    };
  }
  if (config.kind === "validator") {
    const isOxc = config.validator_type === "oxc";
    const isJson = config.validator_type === "json";
    const isMarkdown = config.validator_type === "markdown";
    const isSql = config.code_lang.startsWith("sql:");
    let subtype = "Python";
    let blockType: RecipeNodeData["blockType"] = "validator_python";
    if (isJson) {
      subtype = "JSON";
      blockType = "validator_json";
    } else if (isMarkdown) {
      subtype = "Markdown";
      blockType = "validator_markdown";
    } else if (isOxc) {
      subtype = "OXC";
      blockType = "validator_oxc";
    } else if (isSql) {
      subtype = "SQL";
      blockType = "validator_sql";
    }
    return {
      title: translate("uxRecipestudio.checkoqqg2"),
      kind: "validator",
      subtype,
      blockType,
      name: config.name,
      layoutDirection,
    };
  }
  if (config.kind === "markdown_note") {
    return {
      title: translate("library.create.note"),
      kind: "note",
      subtype: "Markdown",
      blockType: "markdown_note",
      name: config.name,
      layoutDirection,
    };
  }
  if (config.kind === "seed") {
    const seedSourceType = config.seed_source_type ?? "hf";
    const sourceLabel =
      seedSourceType === "hf"
        ? translate("uxRecipestudio.huggingFaceDatasetq06ps")
        : seedSourceType === "local"
          ? translate("uxRecipestudio.cSVOrJSONFileotgnm")
          : seedSourceType === "github_repo"
            ? translate("uxRecipestudio.gitHubRepositoriesywji6")
            : translate("uxRecipestudio.documentFilejp1qz");
    return {
      title: translate("uxRecipestudio.sourceDatabj3o5"),
      kind: "seed",
      subtype: sourceLabel,
      blockType: "seed",
      name: sourceLabel,
      layoutDirection,
    };
  }
  if (config.kind === "model_provider") {
    return {
      title: translate("uxRecipestudio.providerConnection1307t"),
      kind: "model_provider",
      subtype: config.provider_type || "Connection",
      blockType: "model_provider",
      name: config.name,
      layoutDirection,
    };
  }
  if (config.kind === "model_config") {
    return {
      title: translate("uxRecipestudio.modelPresetrgozj"),
      kind: "model_config",
      subtype: config.model || "Model",
      blockType: "model_config",
      name: config.name,
      layoutDirection,
    };
  }
  if (config.kind === "tool_config") {
    const providerCount = config.mcp_providers.length;
    return {
      title: translate("uxRecipestudio.toolAccess1ahyl"),
      kind: "tool_config",
      subtype: providerCount === 1 ? "1 server" : `${providerCount} servers`,
      blockType: "tool_config",
      name: config.name,
      layoutDirection,
    };
  }
  return {
    title: translate("uxRecipestudio.aIStep13v0r"),
    kind: "llm",
    subtype: labelForLlm(config.llm_type),
    blockType: config.llm_type,
    name: config.name,
    layoutDirection,
  };
}
