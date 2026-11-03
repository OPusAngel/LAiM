// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { formatExtraArgs } from "../model-config/llama-extra-args";
import {
  type PerModelConfig,
  CACHE_RAM_MAX,
  CACHE_RAM_MIN,
  CONTEXT_LENGTH_MIN,
  CTX_CHECKPOINTS_MAX,
  CTX_CHECKPOINTS_MIN,
  KV_CACHE_DTYPES,
  LOAD_MODES,
  N_BATCH_MAX,
  N_BATCH_MIN,
  N_PARALLEL_MAX,
  N_PARALLEL_MIN,
  SPECULATIVE_TYPES,
} from "../model-config/per-model-config";
import { validSharedExtraArgs } from "./extra-args";

type Validator = (value: unknown) => boolean;

const integer = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= min &&
  value <= max;
const nullable =
  (valid: Validator): Validator =>
  (value) =>
    value === null || valid(value);
const choice = (value: unknown, values: readonly unknown[]): boolean =>
  values.includes(value);
const boolean: Validator = (value) => typeof value === "boolean";

const gpuId: Validator = (value) => integer(value, 0, 255);
const cacheType = nullable(
  (value) => value === "f16" || choice(value, KV_CACHE_DTYPES),
);

// Engine choices stay local: the recipient may not have vLLM or SGLang installed.
export type SharedConfigKey = Exclude<
  keyof PerModelConfig,
  | "chatTemplateOverride"
  | "tensorSplit"
  | "maxSeqLength"
  | "mlxKvQuant"
  | "mlxInt8Prefill"
  | "engine"
  | "enginePrecision"
  | "engineParallelism"
  | "engineKvCacheDtype"
  | "engineSeed"
  | "engineGpuMemoryUtilization"
  | "loadIn4bit"
  // A named drafter can be a local directory.
  | "specDraftModel"
>;
type Field = { label: string; valid: Validator; error?: string };

export const SHARED_CONFIG_FIELDS: Record<SharedConfigKey, Field> = {
  customContextLength: {
    get label() {
      return translate("studio.progress.contextLength");
    },
    valid: nullable((value) =>
      integer(value, CONTEXT_LENGTH_MIN, 2_147_483_647),
    ),
  },
  kvCacheDtype: { get label() { return translate("uxModelpicker.kVCacheTypet1r3j"); }, valid: cacheType },
  speculativeType: {
    get label() {
      return translate("uxModelpicker.speculativeDecoding1o3kv");
    },
    valid: nullable((value) => choice(value, SPECULATIVE_TYPES)),
  },
  specDraftNMax: {
    get label() {
      return translate("studio.params.drafterDraftSteps");
    },
    valid: nullable((value) => integer(value, 1, 16)),
  },
  specDraftCacheDtype: { get label() { return translate("uxModelpicker.draftKVCacheType1g3ej"); }, valid: cacheType },
  nParallel: {
    get label() {
      return translate("uxModelpicker.parallelSlots1g55r");
    },
    valid: nullable((value) => integer(value, N_PARALLEL_MIN, N_PARALLEL_MAX)),
  },
  reasoningBudget: {
    get label() {
      return translate("uxModelpicker.reasoningBudget1c693");
    },
    valid: (value) => integer(value, -1, 2_147_483_647),
  },
  reasoningBudgetMessage: {
    get label() {
      return translate("uxModelpicker.reasoningBudgetMessage1jphg");
    },
    valid: (value) => value === "",
    get error() { return translate("uxModelpicker.customReasoningMessagesCannotmtvdd"); },
  },
  nBatch: {
    get label() {
      return translate("studio.progress.batchSize");
    },
    valid: nullable((value) => integer(value, N_BATCH_MIN, N_BATCH_MAX)),
  },
  nUbatch: {
    get label() {
      return translate("uxModelpicker.microBatchSizem7jqp");
    },
    valid: nullable((value) => integer(value, N_BATCH_MIN, N_BATCH_MAX)),
  },
  loadMode: {
    get label() {
      return translate("uxModelpicker.loadModejsb1k");
    },
    valid: nullable((value) => choice(value, LOAD_MODES)),
  },
  ctxCheckpoints: {
    get label() {
      return translate("uxModelpicker.contextCheckpoints1lpyy");
    },
    valid: nullable((value) =>
      integer(value, CTX_CHECKPOINTS_MIN, CTX_CHECKPOINTS_MAX),
    ),
  },
  cacheRam: {
    get label() {
      return translate("uxModelpicker.promptCacheRAM9nwrz");
    },
    valid: nullable((value) => integer(value, CACHE_RAM_MIN, CACHE_RAM_MAX)),
  },
  tensorParallel: { get label() { return translate("uxModelpicker.tensorParallel1alwm"); }, valid: boolean },
  disableVision: { get label() { return translate("uxModelpicker.disableVision2tk57"); }, valid: boolean },
  llamaExtraArgs: {
    get label() {
      return translate("uxModelpicker.extraArguments1b2m7");
    },
    valid: nullable(validSharedExtraArgs),
    get error() { return translate("uxModelpicker.sharedExtraArgumentsRequirev0hgf"); },
  },
  gpuMemoryMode: {
    get label() { return translate("uxModelpicker.gPUMemoryModelntia"); },
    valid: (value) => value === "auto" || value === "manual",
  },
  gpuLayers: {
    get label() { return translate("uxModelpicker.gPULayers5k5qy"); },
    valid: (value) => integer(value, -1, 2_147_483_647),
  },
  nCpuMoe: {
    get label() { return translate("uxModelpicker.cPUMoELayers9hxml"); },
    valid: (value) => integer(value, 0, 2_147_483_647),
  },
  selectedGpuIds: {
    get label() { return translate("uxModelpicker.gPUDevicesmrcra"); },
    valid: nullable(
      (value) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 256 &&
        value.every(gpuId) &&
        new Set(value).size === value.length,
    ),
  },
  selectedGpuIndexKind: {
    get label() { return translate("uxModelpicker.gPUDeviceIndexTypeiiu3c"); },
    valid: nullable((value) => value === "physical" || value === "vulkan"),
  },
};

export const SHARED_CONFIG_KEYS = Object.keys(
  SHARED_CONFIG_FIELDS,
) as SharedConfigKey[];

export function isSharedConfigKey(key: string): key is SharedConfigKey {
  return Object.hasOwn(SHARED_CONFIG_FIELDS, key);
}

export function formatSharedConfigValue(
  key: SharedConfigKey,
  config: Partial<PerModelConfig>,
): string {
  if (key === "llamaExtraArgs") {
    return formatExtraArgs(config.llamaExtraArgs) || translate("uxModelpicker.noExtraArguments1dzfd");
  }
  const value = config[key];
  return value == null
    ? "Default"
    : typeof value === "string" && value !== ""
      ? value
      : JSON.stringify(value);
}

export function mergeSharedRunConfig(
  defaults: PerModelConfig,
  patch: Partial<PerModelConfig>,
): PerModelConfig {
  const provided = Object.fromEntries(
    SHARED_CONFIG_KEYS.filter((key) => Object.hasOwn(patch, key))
      .map((key) => [key, patch[key]] as const)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  );
  const gpuSelectionChanged = (
    ["selectedGpuIds", "selectedGpuIndexKind"] as const
  ).some(
    (key) =>
      Object.hasOwn(provided, key) &&
      JSON.stringify(provided[key] ?? null) !==
        JSON.stringify(defaults[key] ?? null),
  );
  if (
    gpuSelectionChanged ||
    provided.gpuMemoryMode === "auto" ||
    provided.gpuLayers === -1
  ) {
    provided.tensorSplit = null;
  }
  return { ...defaults, ...provided };
}
