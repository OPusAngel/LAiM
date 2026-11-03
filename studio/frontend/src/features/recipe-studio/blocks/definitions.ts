// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  BalanceScaleIcon,
  Clock01Icon,
  CodeIcon,
  CodeSimpleIcon,
  DiceFaces03Icon,
  DocumentAttachmentIcon,
  DocumentCodeIcon,
  EqualSignIcon,
  FingerPrintIcon,
  FunctionIcon,
  GithubIcon,
  Plug01Icon,
  Parabola02Icon,
  PencilEdit02Icon,
  Plant01Icon,
  Shield02Icon,
  Tag01Icon,
  TagsIcon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";
import type {
  LlmType,
  NodeConfig,
  SamplerType,
  SeedSourceType,
} from "../types";
import {
  makeExpressionConfig,
  makeLlmConfig,
  makeMarkdownNoteConfig,
  makeModelConfig,
  makeModelProviderConfig,
  makeToolProfileConfig,
  makeSamplerConfig,
  makeSeedConfig,
  makeValidatorConfig,
} from "../utils";

export type BlockKind =
  | "sampler"
  | "llm"
  | "validator"
  | "expression"
  | "seed"
  | "note";
export type ValidatorBlockType =
  | "validator_python"
  | "validator_sql"
  | "validator_oxc"
  | "validator_json"
  | "validator_markdown";

export type BlockType =
  | SamplerType
  | LlmType
  | ValidatorBlockType
  | "expression"
  | "markdown_note"
  | "seed"
  | "seed_hf"
  | "seed_local"
  | "seed_unstructured"
  | "seed_github"
  | "model_provider"
  | "model_config"
  | "tool_config";

export type SeedBlockType =
  | "seed_hf"
  | "seed_local"
  | "seed_unstructured"
  | "seed_github";

type IconType = typeof CodeIcon;

export type BlockGroup = {
  kind: BlockKind;
  title: string;
  description: string;
  icon: IconType;
};

export type BlockDialogKey =
  | "seed"
  | "markdown_note"
  | "category"
  | "subcategory"
  | "uniform"
  | "gaussian"
  | "bernoulli"
  | "datetime"
  | "timedelta"
  | "uuid"
  | "person"
  | "llm"
  | "validator"
  | "model_provider"
  | "model_config"
  | "tool_config"
  | "expression";

export type BlockDefinition = {
  kind: BlockKind;
  type: BlockType;
  title: string;
  description: string;
  icon: IconType;
  dialogKey: BlockDialogKey;
  createConfig: (id: string, existing: NodeConfig[]) => NodeConfig;
};

export const BLOCK_GROUPS: BlockGroup[] = [
  {
    kind: "sampler",
    get title() {
      return translate("uxRecipestudio.generatedFieldso9ee4");
    },
    get description() {
      return translate("uxRecipestudio.createFieldsFromLists8qn52");
    },
    icon: DiceFaces03Icon,
  },
  {
    kind: "seed",
    get title() {
      return translate("uxRecipestudio.sourceDatabj3o5");
    },
    get description() {
      return translate("uxRecipestudio.startFromAnExisting15c9r");
    },
    icon: Plant01Icon,
  },
  {
    kind: "llm",
    get title() {
      return translate("uxRecipestudio.aIGeneration17kle");
    },
    get description() {
      return translate("uxRecipestudio.generateContentConnectModels1kxcp");
    },
    icon: PencilEdit02Icon,
  },
  {
    kind: "validator",
    get title() {
      return translate("uxRecipestudio.checks1w0li");
    },
    get description() {
      return translate("uxRecipestudio.lintOrFilterGeneratedey445");
    },
    icon: Shield02Icon,
  },
  {
    kind: "expression",
    get title() {
      return translate("uxRecipestudio.formulas10xdp");
    },
    get description() {
      return translate("uxRecipestudio.buildAFieldFrom3emym");
    },
    icon: FunctionIcon,
  },
  {
    kind: "note",
    get title() {
      return translate("uxRecipestudio.notes4f76g");
    },
    get description() {
      return translate("uxRecipestudio.addMarkdownNotesTo1pq47");
    },
    icon: PencilEdit02Icon,
  },
];

const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    kind: "seed",
    type: "seed_hf",
    get title() {
      return translate("uxRecipestudio.huggingFaceDataset12f02");
    },
    get description() {
      return translate("uxRecipestudio.useRowsFromA10wjy");
    },
    icon: Plant01Icon,
    dialogKey: "seed",
    createConfig: (id, existing) => makeSeedConfig(id, existing, "hf"),
  },
  {
    kind: "seed",
    type: "seed_local",
    get title() {
      return translate("uxRecipestudio.cSVOrJSONFilejq32m");
    },
    get description() {
      return translate("uxRecipestudio.uploadCSVJSONJSONL16jzq");
    },
    icon: DocumentCodeIcon,
    dialogKey: "seed",
    createConfig: (id, existing) => makeSeedConfig(id, existing, "local"),
  },
  {
    kind: "seed",
    type: "seed_unstructured",
    get title() {
      return translate("uxRecipestudio.documentFilen1yko");
    },
    get description() {
      return translate("uxRecipestudio.uploadPDFDOCXOr3ahyn");
    },
    icon: DocumentAttachmentIcon,
    dialogKey: "seed",
    createConfig: (id, existing) => makeSeedConfig(id, existing, "unstructured"),
  },
  {
    kind: "seed",
    type: "seed_github",
    get title() {
      return translate("uxRecipestudio.gitHubRepositories1btyu");
    },
    get description() {
      return translate("uxRecipestudio.crawlIssuesPullRequests17mw5");
    },
    icon: GithubIcon,
    dialogKey: "seed",
    createConfig: (id, existing) => makeSeedConfig(id, existing, "github_repo"),
  },
  {
    kind: "sampler",
    type: "category",
    get title() {
      return translate("uxRecipestudio.category1cr1m");
    },
    get description() {
      return translate("uxRecipestudio.generateValuesFromA16257");
    },
    icon: Tag01Icon,
    dialogKey: "category",
    createConfig: (id, existing) => makeSamplerConfig(id, "category", existing),
  },
  {
    kind: "sampler",
    type: "subcategory",
    get title() {
      return translate("uxRecipestudio.subcategory1ut5b");
    },
    get description() {
      return translate("uxRecipestudio.generateValuesFromGroupsn4fzp");
    },
    icon: TagsIcon,
    dialogKey: "subcategory",
    createConfig: (id, existing) => makeSamplerConfig(id, "subcategory", existing),
  },
  {
    kind: "sampler",
    type: "uniform",
    get title() {
      return translate("uxRecipestudio.randomNumber55303");
    },
    get description() {
      return translate("uxRecipestudio.generateANumberAnywherev0rcl");
    },
    icon: EqualSignIcon,
    dialogKey: "uniform",
    createConfig: (id, existing) => makeSamplerConfig(id, "uniform", existing),
  },
  {
    kind: "sampler",
    type: "gaussian",
    get title() {
      return translate("uxRecipestudio.bellCurveNumber7oiq7");
    },
    get description() {
      return translate("uxRecipestudio.generateNumbersAroundAn1a3sy");
    },
    icon: Parabola02Icon,
    dialogKey: "gaussian",
    createConfig: (id, existing) => makeSamplerConfig(id, "gaussian", existing),
  },
  {
    kind: "sampler",
    type: "bernoulli",
    get title() {
      return translate("uxRecipestudio.yesNoValue5dlmq");
    },
    get description() {
      return translate("uxRecipestudio.generateABinaryResult1gqxx");
    },
    icon: EqualSignIcon,
    dialogKey: "bernoulli",
    createConfig: (id, existing) => makeSamplerConfig(id, "bernoulli", existing),
  },
  {
    kind: "sampler",
    type: "datetime",
    get title() {
      return translate("uxRecipestudio.dateAndTimexzc0q");
    },
    get description() {
      return translate("uxRecipestudio.generateTimestampsInsideAs5aqu");
    },
    icon: Clock01Icon,
    dialogKey: "datetime",
    createConfig: (id, existing) => makeSamplerConfig(id, "datetime", existing),
  },
  {
    kind: "sampler",
    type: "timedelta",
    get title() {
      return translate("uxRecipestudio.timeOffset159xs");
    },
    get description() {
      return translate("uxRecipestudio.generateATimeDifferencej8aa5");
    },
    icon: Clock01Icon,
    dialogKey: "timedelta",
    createConfig: (id, existing) => makeSamplerConfig(id, "timedelta", existing),
  },
  {
    kind: "sampler",
    type: "uuid",
    get title() {
      return translate("uxRecipestudio.uniqueID1e6mu");
    },
    get description() {
      return translate("uxRecipestudio.generateUniqueIdentifiersb6xen");
    },
    icon: FingerPrintIcon,
    dialogKey: "uuid",
    createConfig: (id, existing) => makeSamplerConfig(id, "uuid", existing),
  },
  {
    kind: "sampler",
    type: "person",
    get title() {
      return translate("uxRecipestudio.syntheticPerson135dc");
    },
    get description() {
      return translate("uxRecipestudio.generateRealisticPersonDetails13lil");
    },
    icon: UserAccountIcon,
    dialogKey: "person",
    createConfig: (id, existing) => makeSamplerConfig(id, "person", existing),
  },
  {
    kind: "llm",
    type: "text",
    get title() {
      return translate("uxRecipestudio.aITextzzmie");
    },
    get description() {
      return translate("uxRecipestudio.generateTextFromYour1ktgb");
    },
    icon: PencilEdit02Icon,
    dialogKey: "llm",
    createConfig: (id, existing) => makeLlmConfig(id, "text", existing),
  },
  {
    kind: "llm",
    type: "structured",
    get title() {
      return translate("uxRecipestudio.aIStructuredDatauqkn6");
    },
    get description() {
      return translate("uxRecipestudio.generateJSONThatFollows1nu0i");
    },
    icon: CodeIcon,
    dialogKey: "llm",
    createConfig: (id, existing) => makeLlmConfig(id, "structured", existing),
  },
  {
    kind: "llm",
    type: "code",
    get title() {
      return translate("uxRecipestudio.aICode1xoyz");
    },
    get description() {
      return translate("uxRecipestudio.generateCodeInThels1ky");
    },
    icon: CodeSimpleIcon,
    dialogKey: "llm",
    createConfig: (id, existing) => makeLlmConfig(id, "code", existing),
  },
  {
    kind: "llm",
    type: "judge",
    get title() {
      return translate("uxRecipestudio.aIScorer1yvmy");
    },
    get description() {
      return translate("uxRecipestudio.scoreOutputsAgainstYourpf6gr");
    },
    icon: BalanceScaleIcon,
    dialogKey: "llm",
    createConfig: (id, existing) => makeLlmConfig(id, "judge", existing),
  },
  {
    kind: "llm",
    type: "model_provider",
    get title() {
      return translate("uxRecipestudio.providerConnection1307t");
    },
    get description() {
      return translate("uxRecipestudio.chooseWhereModelRequests1j3di");
    },
    icon: Shield02Icon,
    dialogKey: "model_provider",
    createConfig: (id, existing) => makeModelProviderConfig(id, existing),
  },
  {
    kind: "llm",
    type: "model_config",
    get title() {
      return translate("uxRecipestudio.modelPresetrgozj");
    },
    get description() {
      return translate("uxRecipestudio.pickAModelAnd1ddyc");
    },
    icon: Plant01Icon,
    dialogKey: "model_config",
    createConfig: (id, existing) => makeModelConfig(id, existing),
  },
  {
    kind: "llm",
    type: "tool_config",
    get title() {
      return translate("uxRecipestudio.toolAccess1ahyl");
    },
    get description() {
      return translate("uxRecipestudio.chooseWhichToolsAn1ghl7");
    },
    icon: Plug01Icon,
    dialogKey: "tool_config",
    createConfig: (id, existing) => makeToolProfileConfig(id, existing),
  },
  {
    kind: "validator",
    type: "validator_python",
    get title() {
      return translate("uxRecipestudio.pythonCheck108qx");
    },
    get description() {
      return translate("uxRecipestudio.lintGeneratedPythonAnd148jr");
    },
    icon: Shield02Icon,
    dialogKey: "validator",
    createConfig: (id, existing) =>
      makeValidatorConfig(id, "code", "python", existing),
  },
  {
    kind: "validator",
    type: "validator_sql",
    get title() {
      return translate("uxRecipestudio.sQLCheck1dgl1");
    },
    get description() {
      return translate("uxRecipestudio.lintGeneratedSQLAnd186qu");
    },
    icon: Shield02Icon,
    dialogKey: "validator",
    createConfig: (id, existing) =>
      makeValidatorConfig(id, "code", "sql:sqlite", existing),
  },
  {
    kind: "validator",
    type: "validator_oxc",
    get title() {
      return translate("uxRecipestudio.jSTSCheck1ca07");
    },
    get description() {
      return translate("uxRecipestudio.lintGeneratedJavaScriptOr1s3mo");
    },
    icon: Shield02Icon,
    dialogKey: "validator",
    createConfig: (id, existing) =>
      makeValidatorConfig(id, "oxc", "javascript", existing),
  },
  {
    kind: "validator",
    type: "validator_json",
    get title() { return translate("uxRecipestudio.jSONCheckmd7tu"); },
    get description() {
      return translate("uxRecipestudio.verifyAFieldContainso45ij");
    },
    icon: Shield02Icon,
    dialogKey: "validator",
    createConfig: (id, existing) =>
      makeValidatorConfig(id, "json", "json", existing),
  },
  {
    kind: "validator",
    type: "validator_markdown",
    get title() {
      return translate("uxRecipestudio.markdownCheck1ns37");
    },
    get description() {
      return translate("uxRecipestudio.verifyAFieldContains1wmdn");
    },
    icon: Shield02Icon,
    dialogKey: "validator",
    createConfig: (id, existing) =>
      makeValidatorConfig(id, "markdown", "markdown", existing),
  },
  {
    kind: "expression",
    type: "expression",
    get title() {
      return translate("uxRecipestudio.formula1b8ag");
    },
    get description() {
      return translate("uxRecipestudio.buildOrTransformA175c2");
    },
    icon: FunctionIcon,
    dialogKey: "expression",
    createConfig: (id, existing) => makeExpressionConfig(id, existing),
  },
  {
    kind: "note",
    type: "markdown_note",
    get title() {
      return translate("library.create.note");
    },
    get description() {
      return translate("uxRecipestudio.addANoteTo1vy3x");
    },
    icon: PencilEdit02Icon,
    dialogKey: "markdown_note",
    createConfig: (id, existing) => makeMarkdownNoteConfig(id, existing),
  },
];

export function getBlocksForKind(kind: BlockKind): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter((block) => block.kind === kind);
}

export function getBlockDefinition(
  kind: BlockKind,
  type: BlockType,
): BlockDefinition | null {
  return (
    BLOCK_DEFINITIONS.find((block) => block.kind === kind && block.type === type) ??
    null
  );
}

export function getBlockDefinitionForConfig(
  config: NodeConfig | null,
): BlockDefinition | null {
  if (!config) {
    return null;
  }
  if (config.kind === "seed") {
    const seedType: Record<SeedSourceType, SeedBlockType> = {
      hf: "seed_hf",
      local: "seed_local",
      unstructured: "seed_unstructured",
      github_repo: "seed_github",
    };
    return getBlockDefinition("seed", seedType[config.seed_source_type ?? "hf"]);
  }
  if (config.kind === "sampler") {
    const samplerType =
      config.sampler_type === "person_from_faker" ? "person" : config.sampler_type;
    return getBlockDefinition("sampler", samplerType);
  }
  if (config.kind === "llm") {
    return getBlockDefinition("llm", config.llm_type);
  }
  if (config.kind === "validator") {
    if (config.validator_type === "json") {
      return getBlockDefinition("validator", "validator_json");
    }
    if (config.validator_type === "markdown") {
      return getBlockDefinition("validator", "validator_markdown");
    }
    if (config.validator_type === "oxc") {
      return getBlockDefinition("validator", "validator_oxc");
    }
    const isSql = config.code_lang.startsWith("sql:");
    return getBlockDefinition(
      "validator",
      isSql ? "validator_sql" : "validator_python",
    );
  }
  if (config.kind === "model_provider") {
    return getBlockDefinition("llm", "model_provider");
  }
  if (config.kind === "model_config") {
    return getBlockDefinition("llm", "model_config");
  }
  if (config.kind === "tool_config") {
    return getBlockDefinition("llm", "tool_config");
  }
  if (config.kind === "markdown_note") {
    return getBlockDefinition("note", "markdown_note");
  }
  return getBlockDefinition("expression", "expression");
}
