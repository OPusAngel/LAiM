// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { Edge } from "@xyflow/react";
import { INFRA_NODE_KINDS, type NodeConfig } from "../types";
import { translate } from "@/i18n";


export type GraphWarning = {
  nodeId?: string;
  nodeName?: string;
  global?: boolean;
  message: string;
  severity: "error" | "warning";
};

function checkDataSourceRequired(allConfigs: NodeConfig[]): GraphWarning[] {
  const hasLlm = allConfigs.some((c) => c.kind === "llm");
  const hasDataSource = allConfigs.some(
    (c) => c.kind === "seed" || c.kind === "sampler" || c.kind === "expression",
  );
  if (hasLlm && !hasDataSource) {
    return [
      {
        global: true,
        get message() { return translate("uxRecipestudio.addADataSourceqwt1w"); },
        severity: "warning",
      },
    ];
  }
  return [];
}

function checkLlmModelAlias(allConfigs: NodeConfig[]): GraphWarning[] {
  const warnings: GraphWarning[] = [];
  for (const config of allConfigs) {
    if (config.kind === "llm" && !config.model_alias?.trim()) {
      warnings.push({
        nodeId: config.id,
        nodeName: config.name,
        get message() { return translate("uxRecipestudio.needsAModelPreseti7y7j"); },
        severity: "error",
      });
    }
  }
  return warnings;
}

function checkModelConfigProvider(allConfigs: NodeConfig[]): GraphWarning[] {
  const warnings: GraphWarning[] = [];
  for (const config of allConfigs) {
    if (config.kind === "model_config" && !config.provider?.trim()) {
      warnings.push({
        nodeId: config.id,
        nodeName: config.name,
        get message() { return translate("uxRecipestudio.needsAProviderConnectionsq9v4"); },
        severity: "error",
      });
    }
  }
  return warnings;
}

function checkSubcategoryParent(allConfigs: NodeConfig[]): GraphWarning[] {
  const categoryNames = new Set(
    allConfigs
      .filter((c) => c.kind === "sampler" && c.sampler_type === "category")
      .map((c) => c.name),
  );
  const warnings: GraphWarning[] = [];
  for (const config of allConfigs) {
    if (config.kind !== "sampler" || config.sampler_type !== "subcategory") {
      continue;
    }
    if (!config.subcategory_parent?.trim()) {
      warnings.push({
        nodeId: config.id,
        nodeName: config.name,
        get message() { return translate("uxRecipestudio.needsAParentCategoryxj8kz"); },
        severity: "error",
      });
    } else if (!categoryNames.has(config.subcategory_parent)) {
      warnings.push({
        nodeId: config.id,
        nodeName: config.name,
        get message() { return translate("uxRecipestudio.parentCategoryNotFound4abgi", { p1: config.subcategory_parent }); },
        severity: "error",
      });
    }
  }
  return warnings;
}

function checkValidatorTargets(allConfigs: NodeConfig[]): GraphWarning[] {
  const warnings: GraphWarning[] = [];
  for (const config of allConfigs) {
    if (
      config.kind === "validator" &&
      (!config.target_columns || config.target_columns.length === 0)
    ) {
      warnings.push({
        nodeId: config.id,
        nodeName: config.name,
        get message() { return translate("uxRecipestudio.needsAtLeastOne32d9g"); },
        severity: "warning",
      });
    }
  }
  return warnings;
}

function checkDisconnectedNodes(
  allConfigs: NodeConfig[],
  edges: Edge[],
): GraphWarning[] {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const warnings: GraphWarning[] = [];
  for (const config of allConfigs) {
    if (config.kind === "markdown_note") {
      continue;
    }
    if (connectedIds.has(config.id)) {
      continue;
    }

    warnings.push({
      nodeId: config.id,
      nodeName: config.name,
      get message() { return translate("uxRecipestudio.thisBlockHasNoaz829"); },
      severity: "warning",
    });
  }
  return warnings;
}

function checkLlmMissingDataInput(
  allConfigs: NodeConfig[],
  edges: Edge[],
): GraphWarning[] {
  const configById = new Map(allConfigs.map((c) => [c.id, c]));

  /** LLM IDs that have at least one non-infra pipeline edge. */
  const llmWithPipelineEdge = new Set<string>();
  for (const edge of edges) {
    const sourceConfig = configById.get(edge.source);
    const targetConfig = configById.get(edge.target);

    if (
      sourceConfig?.kind === "llm" &&
      targetConfig &&
      !INFRA_NODE_KINDS.has(targetConfig.kind)
    ) {
      llmWithPipelineEdge.add(sourceConfig.id);
    }
    if (
      targetConfig?.kind === "llm" &&
      sourceConfig &&
      !INFRA_NODE_KINDS.has(sourceConfig.kind)
    ) {
      llmWithPipelineEdge.add(targetConfig.id);
    }
  }

  const warnings: GraphWarning[] = [];
  for (const config of allConfigs) {
    if (config.kind !== "llm") {
      continue;
    }
    if (llmWithPipelineEdge.has(config.id)) {
      continue;
    }

    const hasAnyEdge = edges.some(
      (e) => e.source === config.id || e.target === config.id,
    );
    if (!hasAnyEdge) {
      continue; // already caught by checkDisconnectedNodes
    }

    warnings.push({
      nodeId: config.id,
      nodeName: config.name,
      get message() { return translate("uxRecipestudio.noDataPipelineConnectionin8j8"); },
      severity: "warning",
    });
  }
  return warnings;
}

export function getGraphWarnings(
  configs: Record<string, NodeConfig>,
  edges: Edge[] = [],
): GraphWarning[] {
  const allConfigs = Object.values(configs);
  return [
    ...checkDataSourceRequired(allConfigs),
    ...checkLlmModelAlias(allConfigs),
    ...checkModelConfigProvider(allConfigs),
    ...checkSubcategoryParent(allConfigs),
    ...checkValidatorTargets(allConfigs),
    ...checkDisconnectedNodes(allConfigs, edges),
    ...checkLlmMissingDataInput(allConfigs, edges),
  ];
}
