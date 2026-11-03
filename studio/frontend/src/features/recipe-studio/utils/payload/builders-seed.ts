// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { NodeConfig, SeedConfig } from "../../types";
import { translate } from "@/i18n";


const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 200;
const MAX_CHUNK_SIZE = 20000;
const GITHUB_ITEM_TYPES = new Set(["issues", "pulls", "commits"]);

function parseIntStrict(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) return null;
  return num;
}

function resolveChunking(config: SeedConfig): { chunkSize: number; chunkOverlap: number } {
  const rawSize = parseIntStrict(config.unstructured_chunk_size);
  const rawOverlap = parseIntStrict(config.unstructured_chunk_overlap);
  const chunkSize = Math.min(MAX_CHUNK_SIZE, Math.max(1, rawSize ?? DEFAULT_CHUNK_SIZE));
  const chunkOverlap = Math.min(
    Math.max(0, chunkSize - 1),
    Math.max(0, rawOverlap ?? DEFAULT_CHUNK_OVERLAP),
  );
  return { chunkSize, chunkOverlap };
}

export function buildSeedConfig(
  config: SeedConfig,
  errors: string[],
): Record<string, unknown> | undefined {
  const seedSourceType = config.seed_source_type ?? "hf";
  const path = config.hf_path.trim();

  // Only an endpoint the user set. The seed is fetched BY THE BACKEND, which
  // resolves its own HF_ENDPOINT when this is absent; sending the browser's value
  // would ship a remote client's substitute into a backend-side fetch.
  const endpoint = config.hf_endpoint?.trim() || null;
  const token = config.hf_token?.trim() || null;

  let selectionStrategy: Record<string, unknown> | null = null;
  if (config.selection_type === "index_range") {
    const start = parseIntStrict(config.selection_start);
    const end = parseIntStrict(config.selection_end);
    if (start === null || end === null) {
      errors.push(translate("uxRecipestudio.seedSelectionIndexRangem5lne", { p1: config.name }));
      return undefined;
    }
    selectionStrategy = { start, end };
  } else if (config.selection_type === "partition_block") {
    const index = parseIntStrict(config.selection_index);
    const numPartitions = parseIntStrict(config.selection_num_partitions);
    if (index === null || numPartitions === null) {
      errors.push(translate("uxRecipestudio.seedSelectionPartitionInvalidvn8lg", { p1: config.name }));
      return undefined;
    }
    // biome-ignore lint/style/useNamingConvention: api schema
    selectionStrategy = { index, num_partitions: numPartitions };
  }

  let source: Record<string, unknown>;
  if (seedSourceType === "hf") {
    source = {
      // biome-ignore lint/style/useNamingConvention: api schema
      seed_type: "hf",
      path,
      token,
      endpoint,
    };
  } else if (seedSourceType === "unstructured") {
    const { chunkSize, chunkOverlap } = resolveChunking(config);
    source = {
      // biome-ignore lint/style/useNamingConvention: api schema
      seed_type: "unstructured",
      paths: config.resolved_paths?.length ? config.resolved_paths : [config.hf_path],
      // biome-ignore lint/style/useNamingConvention: api schema
      chunk_size: chunkSize,
      // biome-ignore lint/style/useNamingConvention: api schema
      chunk_overlap: chunkOverlap,
    };
  } else if (seedSourceType === "github_repo") {
    const repos = (config.github_repo_slug ?? "")
      .split(/[\n,]/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (repos.length === 0) {
      errors.push(translate("uxRecipestudio.seedAtLeastOnetfkxj", { p1: config.name }));
      return undefined;
    }
    const invalidRepo = repos.find((repo) => {
      const parts = repo.split("/");
      return parts.length !== 2 || parts.some((part) => !part);
    });
    if (invalidRepo) {
      errors.push(
        `Seed ${config.name}: GitHub repositories must use owner/name format.`,
      );
      return undefined;
    }
    const itemTypes = config.github_item_types?.length
      ? config.github_item_types
      : ["issues", "pulls"];
    if (itemTypes.some((itemType) => !GITHUB_ITEM_TYPES.has(itemType))) {
      errors.push(translate("uxRecipestudio.seedGitHubItemTypeslnvy5", { p1: config.name }));
      return undefined;
    }
    const limitNum = parseIntStrict(config.github_limit ?? "100");
    if (limitNum === null || limitNum < 1 || limitNum > 5000) {
      errors.push(
        translate("uxRecipestudio.seedGitHubItemsPer46y34", { p1: config.name }),
      );
      return undefined;
    }
    const maxCommentsNum = parseIntStrict(config.github_max_comments_per_item ?? "30");
    if (maxCommentsNum === null || maxCommentsNum < 0 || maxCommentsNum > 200) {
      errors.push(
        translate("uxRecipestudio.seedGitHubMaxCommentsuykom", { p1: config.name }),
      );
      return undefined;
    }
    source = {
      // biome-ignore lint/style/useNamingConvention: api schema
      seed_type: "github_repo",
      repos,
      token: (config.github_token ?? "").trim(),
      // biome-ignore lint/style/useNamingConvention: api schema
      item_types: itemTypes,
      limit: limitNum,
      // biome-ignore lint/style/useNamingConvention: api schema
      include_comments: config.github_include_comments ?? true,
      // biome-ignore lint/style/useNamingConvention: api schema
      max_comments_per_item: maxCommentsNum,
    };
  } else {
    source = {
      // biome-ignore lint/style/useNamingConvention: api schema
      seed_type: "local",
      path,
    };
  }

  return {
    source,
    // biome-ignore lint/style/useNamingConvention: api schema
    sampling_strategy: config.sampling_strategy,
    // biome-ignore lint/style/useNamingConvention: api schema
    selection_strategy: selectionStrategy,
  };
}

export function pickFirstSeedConfig(
  configs: Record<string, NodeConfig>,
): SeedConfig | null {
  for (const config of Object.values(configs)) {
    if (config.kind === "seed") {
      return config;
    }
  }
  return null;
}

export function buildSeedDropProcessor(
  config: SeedConfig,
  errors: string[],
): Record<string, unknown> | null {
  const seedSourceType = config.seed_source_type ?? "hf";
  const loadedCols = (config.seed_columns ?? []).map((c) => c.trim()).filter(Boolean);
  const selectedDropColumns = (config.seed_drop_columns ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  let cols: string[] = [];

  if (seedSourceType === "unstructured") {
    if (!config.drop) {
      return null;
    }
    cols =
      selectedDropColumns.length > 0
        ? loadedCols.length > 0
          ? selectedDropColumns.filter((col) => loadedCols.includes(col))
          : selectedDropColumns
        : loadedCols.length > 0
          ? loadedCols
          : ["chunk_text", "source_file"];
  } else {
    if (selectedDropColumns.length === 0) {
      return null;
    }
    const loadedSet = new Set(loadedCols);
    cols =
      loadedCols.length > 0
        ? selectedDropColumns.filter((col) => loadedSet.has(col))
        : selectedDropColumns;
  }

  if (cols.length === 0) {
    errors.push(
      translate("uxRecipestudio.seedSelectedDropColumns4a433", { p1: config.name }),
    );
    return null;
  }
  return {
    // biome-ignore lint/style/useNamingConvention: api schema
    processor_type: "drop_columns",
    name: "drop_seed_columns",
    // biome-ignore lint/style/useNamingConvention: api schema
    column_names: cols,
  };
}
