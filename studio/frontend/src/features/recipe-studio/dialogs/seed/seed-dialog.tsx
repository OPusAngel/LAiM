// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { UnstructuredDropZone, type FileEntry } from "./unstructured-drop-zone";
import {
  LOCAL_SEED_UPLOAD_MAX_BYTES,
  LOCAL_SEED_UPLOAD_MAX_LABEL,
} from "./upload-limits";
import {
  getGithubEnvTokenStatus,
  inspectSeedDataset,
  inspectSeedUpload,
} from "../../api";
import { useRecipeStudioStore } from "../../stores/recipe-studio";
import {
  makeUnstructuredUploadUid,
  resolveUnstructuredUploadBlockId,
} from "../../utils/config-factories";
import { resolveImagePreview } from "../../utils/image-preview";
import type {
  GithubItemType,
  SeedConfig,
  SeedSamplingStrategy,
  SeedSelectionType,
} from "../../types";
import { CollapsibleSectionTriggerButton } from "../shared/collapsible-section-trigger";
import { HfDatasetCombobox } from "../../components/shared/hf-dataset-combobox";
import { FieldLabel } from "../shared/field-label";

const SAMPLING_OPTIONS: Array<{ value: SeedSamplingStrategy; label: string }> =
  [
    { value: "ordered", get label() { return translate("uxRecipestudio.ordered6krmu"); } },
    { value: "shuffle", get label() { return translate("uxRecipestudio.shuffle14r76"); } },
  ];

const SELECTION_OPTIONS: Array<{ value: SeedSelectionType; label: string }> = [
  { value: "none", get label() { return translate("composer.pill.effortNone"); } },
  { value: "index_range", get label() { return translate("uxRecipestudio.indexRangeave7z"); } },
  { value: "partition_block", get label() { return translate("uxRecipestudio.partitionBlock1mhnv"); } },
];

const LOCAL_ACCEPT = ".csv,.json,.jsonl,.parquet";
const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 200;
const MAX_CHUNK_SIZE = 20000;
const PREVIEW_TRUNCATE_AT = 320;
const GITHUB_TRAILING_PUNCTUATION_RE = /[),.;]+$/g;
const GITHUB_SSH_PREFIX_RE = /^git@github\.com:/i;
const URL_PROTOCOL_RE = /^https?:\/\//i;
const WWW_PREFIX_RE = /^www\./i;
const URL_QUERY_OR_HASH_RE = /[?#]/;
const GIT_SUFFIX_RE = /\.git$/i;
const GITHUB_REPO_INPUT_SPLIT_RE = /[\s,]+/;
const GITHUB_REPO_PART_RE = /^[A-Za-z0-9_.-]+$/;

type SeedDialogProps = {
  config: SeedConfig;
  onUpdate: (patch: Partial<SeedConfig>) => void;
  open: boolean;
};

function normalizeGithubRepoInput(value: string): string {
  let raw = value.trim().replace(GITHUB_TRAILING_PUNCTUATION_RE, "");
  if (!raw) {
    return "";
  }
  raw = raw.replace(GITHUB_SSH_PREFIX_RE, "https://github.com/");
  raw = raw.replace(URL_PROTOCOL_RE, "");
  raw = raw.replace(WWW_PREFIX_RE, "");
  if (raw.toLowerCase().startsWith("github.com/")) {
    raw = raw.slice("github.com/".length);
  }
  raw = raw.split(URL_QUERY_OR_HASH_RE)[0] ?? "";
  raw = raw.replace(GIT_SUFFIX_RE, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return raw;
}

function splitGithubRepoInput(value: string): string[] {
  return value
    .split(GITHUB_REPO_INPUT_SPLIT_RE)
    .map(normalizeGithubRepoInput)
    .filter(Boolean);
}

function getGithubRepoError(repo: string): string | null {
  const parts = repo.split("/");
  if (parts.length !== 2 || parts.some((part) => !part.trim())) {
    return translate("uxRecipestudio.useOwnerNamefxuht");
  }
  if (parts.some((part) => !GITHUB_REPO_PART_RE.test(part))) {
    return translate("uxRecipestudio.useOnlyGitHubRepodocgi");
  }
  return null;
}

function githubLimitString(value: string | undefined): string {
  return (value ?? "100").trim();
}

export function GithubRepoSeedForm({
  config,
  onUpdate,
}: {
  config: SeedConfig;
  onUpdate: (patch: Partial<SeedConfig>) => void;
}): ReactElement {
  const [repoDraft, setRepoDraft] = useState("");
  const [serverHasEnvToken, setServerHasEnvToken] = useState<boolean | null>(
    null,
  );
  const repoInputId = useId();
  const repoHelpId = useId();
  const repoErrorId = useId();
  const tokenId = useId();
  const tokenHelpId = useId();
  const limitId = useId();
  const limitHelpId = useId();
  const commentsId = useId();
  const includeCommentsId = useId();
  const commentsHelpId = useId();
  const repos = useMemo(
    () => splitGithubRepoInput(config.github_repo_slug ?? ""),
    [config.github_repo_slug],
  );
  const repoErrors = repos
    .map((repo, index) => ({ repo, index, error: getGithubRepoError(repo) }))
    .filter((item) => item.error);
  const hasRepoErrors = repoErrors.length > 0;
  const configuredItemTypes = config.github_item_types;
  const itemTypes: GithubItemType[] =
    configuredItemTypes && configuredItemTypes.length > 0
      ? configuredItemTypes
      : ["issues", "pulls"];
  const limitNum = Number.parseInt(githubLimitString(config.github_limit), 10);
  const boundedLimit = Number.isFinite(limitNum)
    ? Math.min(5000, Math.max(1, limitNum))
    : 100;
  const estimatedItems = repos.length * itemTypes.length * boundedLimit;
  const includeComments = config.github_include_comments ?? true;
  const hasToken = Boolean(config.github_token?.trim());
  const usingEnvToken = !hasToken && serverHasEnvToken === true;

  useEffect(() => {
    let cancelled = false;
    void getGithubEnvTokenStatus()
      .then((status) => {
        if (!cancelled) setServerHasEnvToken(status.has_token);
      })
      .catch(() => {
        if (!cancelled) setServerHasEnvToken(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateRepos(nextRepos: string[]): void {
    const seen = new Set<string>();
    const deduped = nextRepos.filter((repo) => {
      const key = repo.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    onUpdate({ github_repo_slug: deduped.join("\n") });
  }

  function addRepos(raw: string): void {
    const next = splitGithubRepoInput(raw);
    if (next.length === 0) {
      return;
    }
    updateRepos([...repos, ...next]);
    setRepoDraft("");
  }

  function removeRepo(index: number): void {
    updateRepos(repos.filter((_, i) => i !== index));
  }

  function handleRepoKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (["Enter", ",", " "].includes(event.key)) {
      event.preventDefault();
      addRepos(repoDraft);
    } else if (event.key === "Backspace" && !repoDraft && repos.length > 0) {
      event.preventDefault();
      removeRepo(repos.length - 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <FieldLabel
          label={translate("uxRecipestudio.gitHubRepositories1btyu")}
          htmlFor={repoInputId}
          hint={translate("uxRecipestudio.pasteOwnerNameEntriesng8ea")}
        />
        <div
          className={cn(
            "nodrag flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1.5",
            hasRepoErrors && "border-red-500/70",
          )}
        >
          {repos.map((repo, index) => {
            const error = getGithubRepoError(repo);
            return (
              <span
                key={`${repo}-${index}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-mono",
                  error
                    ? "border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300"
                    : "border-border/60 bg-muted/60",
                )}
              >
                {repo}
                <button
                  type="button"
                  className="rounded-full px-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  onClick={() => removeRepo(index)}
                  aria-label={translate("uxRecipestudio.removecucki", { p1: repo })}
                >
                  ×
                </button>
              </span>
            );
          })}
          <input
            id={repoInputId}
            className="min-w-36 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            value={repoDraft}
            onChange={(event) => setRepoDraft(event.target.value)}
            onKeyDown={handleRepoKeyDown}
            onBlur={() => addRepos(repoDraft)}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text");
              if (pasted) {
                event.preventDefault();
                addRepos(pasted);
              }
            }}
            placeholder={
              repos.length === 0
                ? "OPusAngel/LAiM or GitHub URL"
                : translate("uxRecipestudio.addRepoj7o76")
            }
            aria-invalid={hasRepoErrors}
            aria-describedby={`${repoHelpId}${hasRepoErrors ? ` ${repoErrorId}` : ""}`}
          />
        </div>
        <p id={repoHelpId} className="text-xs text-muted-foreground">
          {translate("uxCopy.storedAsOne1tmxl")} <code>owner/name</code>{translate("uxRecipestudio.repoPerLineIn07ukk")}</p>
        {hasRepoErrors && (
          <ul id={repoErrorId} className="space-y-0.5 text-xs text-red-600">
            {repoErrors.map((item) => (
              <li key={`${item.repo}-${item.index}`}>{translate("uxRecipestudio.rowo0yb7", { p1: item.index + 1, p2: item.error })}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <FieldLabel
            label={translate("uxRecipestudio.gitHubTokenOptional1k58o")}
            htmlFor={tokenId}
            hint={translate("uxRecipestudio.preferTheServerGH12coq")}
          />
          {usingEnvToken && (
            <span className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-ui-10 font-medium text-emerald-700 dark:text-emerald-300">
              {translate("uxRecipestudio.usingServerEnvVar157eb")}
            </span>
          )}
        </div>
        <Input
          id={tokenId}
          type="password"
          className="nodrag"
          value={config.github_token ?? ""}
          onChange={(e) => onUpdate({ github_token: e.target.value })}
          placeholder={
            usingEnvToken
              ? translate("uxRecipestudio.usingServerGHTOKENvbph5")
              : translate("uxRecipestudio.leaveBlankToUsejn866")
          }
          aria-describedby={tokenHelpId}
        />
        <p id={tokenHelpId} className="text-xs text-muted-foreground">
          {usingEnvToken
            ? "LAiM detected a server env token, so saved/shared recipes can leave this blank."
            : "Blank is safest for saved/shared recipes because LAiM will read the server environment at run time."}
        </p>
        {hasToken && (
          <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            {translate("uxCopy.personalAccessTokensAre1xvap")}
          </p>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase text-muted-foreground">
          {translate("uxRecipestudio.fetchScopeb7mlx")}
        </legend>
        <div className="grid gap-1.5">
          <FieldLabel
            label={translate("uxRecipestudio.itemsPerRepo1v2jp")}
            htmlFor={limitId}
            hint={translate("uxRecipestudio.howManyIssuesPRs1vrxq")}
          />
          <Input
            id={limitId}
            type="number"
            className="nodrag"
            min={1}
            max={5000}
            value={githubLimitString(config.github_limit)}
            onChange={(e) => onUpdate({ github_limit: e.target.value })}
            placeholder="100"
            aria-describedby={limitHelpId}
          />
          <p id={limitHelpId} className="text-xs text-muted-foreground">{translate("uxRecipestudio.estimateBeforeCommentsUph3n8b", { p1: estimatedItems.toLocaleString(), p2: " ", p3: repos.length || 0, p4: itemTypes.length, p5: " ", p6: boundedLimit })}</p>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            {translate("uxRecipestudio.itemTypesba5ow")}
          </span>
          <div className="flex flex-wrap gap-3 text-xs">
            {(["issues", "pulls", "commits"] as const).map((kind) => {
              const checked = itemTypes.includes(kind);
              const itemTypeId = `${repoInputId}-${kind}`;
              return (
                <label
                  key={kind}
                  htmlFor={itemTypeId}
                  className="flex cursor-pointer items-center gap-1.5"
                >
                  <Checkbox
                    id={itemTypeId}
                    checked={checked}
                    onCheckedChange={(v) => {
                      const next =
                        v === true
                          ? Array.from(new Set([...itemTypes, kind]))
                          : itemTypes.filter((k) => k !== kind);
                      onUpdate({
                        github_item_types: next.length > 0 ? next : ["issues"],
                      });
                    }}
                  />
                  <span>{kind}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor={includeCommentsId}
            className="flex cursor-pointer items-center gap-1.5 text-xs"
          >
            <Checkbox
              id={includeCommentsId}
              checked={includeComments}
              onCheckedChange={(v) =>
                onUpdate({ github_include_comments: v === true })
              }
            />
            <span>{translate("uxRecipestudio.includeIssuePRComments09sow")}</span>
          </label>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.maxCommentsItem107qc")}
              htmlFor={commentsId}
              hint={translate("uxRecipestudio.commentsAreConcatenatedIntoe5dt1")}
            />
            <Input
              id={commentsId}
              type="number"
              className="nodrag"
              min={0}
              max={200}
              disabled={!includeComments}
              value={config.github_max_comments_per_item ?? "30"}
              onChange={(e) =>
                onUpdate({ github_max_comments_per_item: e.target.value })
              }
              aria-describedby={commentsHelpId}
            />
            <p id={commentsHelpId} className="text-xs text-muted-foreground">
              {translate("uxCopy.commentsIncreaseGraphQLCost1tpdl")}
            </p>
          </div>
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">{translate("uxRecipestudio.backedByLAiMSw359a")}<code>github_repo</code>{translate("uxRecipestudio.seedReaderLargeReposjp1yv")}</p>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isExpandablePreviewValue(value: string): boolean {
  return value.length > PREVIEW_TRUNCATE_AT;
}

function truncatePreviewValue(value: string): string {
  if (!isExpandablePreviewValue(value)) {
    return value;
  }
  return `${value.slice(0, PREVIEW_TRUNCATE_AT)}…`;
}

function getPreviewEmptyStateCopy(mode: SeedConfig["seed_source_type"]): {
  title: string;
  description: string;
} {
  if (mode === "local") {
    return {
      get title() {
        return translate("uxRecipestudio.noPreviewYetmzpx7");
      },
      get description() {
        return translate("uxRecipestudio.uploadACSVJSONl8fe7");
      },
    };
  }
  if (mode === "unstructured") {
    return {
      get title() {
        return translate("uxRecipestudio.noPreviewYetmzpx7");
      },
      get description() {
        return translate("uxRecipestudio.uploadYourDocumentsAndehv4v");
      },
    };
  }
  if (mode === "github_repo") {
    return {
      get title() {
        return translate("uxRecipestudio.gitHubDataLoadsDuring1vnnm");
      },
      get description() {
        return translate("uxRecipestudio.configureReposItemTypese5p32");
      },
    };
  }
  return {
    get title() {
      return translate("uxRecipestudio.noPreviewYetmzpx7");
    },
    get description() {
      return translate("uxRecipestudio.selectAHuggingFacenszz0");
    },
  };
}

function parseChunkNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = value?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const int = Math.floor(parsed);
  if (int < min) return min;
  if (int > max) return max;
  return int;
}

function resolveChunking(config: SeedConfig): {
  chunkSize: number;
  chunkOverlap: number;
} {
  const chunkSize = parseChunkNumber(
    config.unstructured_chunk_size,
    DEFAULT_CHUNK_SIZE,
    1,
    MAX_CHUNK_SIZE,
  );
  const chunkOverlap = parseChunkNumber(
    config.unstructured_chunk_overlap,
    DEFAULT_CHUNK_OVERLAP,
    0,
    Math.max(0, chunkSize - 1),
  );
  return { chunkSize, chunkOverlap };
}

async function fileToBase64Payload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      const parts = value.split(",");
      resolve(parts.length > 1 ? parts[1] : value);
    };
    reader.onerror = () => reject(new Error(translate("uxRecipestudio.failedToReadFilew7lyq")));
    reader.readAsDataURL(file);
  });
}

export function SeedDialog({
  config,
  onUpdate,
  open,
}: SeedDialogProps): ReactElement {
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const advancedOpen = config.advancedOpen === true;
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [expandedPreviewRows, setExpandedPreviewRows] = useState<
    Record<number, boolean>
  >({});
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [unstructuredFiles, setUnstructuredFiles] = useState<FileEntry[]>(
    () => {
      if (config.unstructured_file_ids?.length) {
        return config.unstructured_file_ids.map((id, i) => ({
          id,
          name: config.unstructured_file_names?.[i] ?? "Unknown",
          size: config.unstructured_file_sizes?.[i] ?? 0,
          status: "ok" as const,
        }));
      }
      return [];
    },
  );

  const mode = config.seed_source_type ?? "hf";
  const previewEmpty = getPreviewEmptyStateCopy(mode);

  const queueUploadCleanup = useRecipeStudioStore(
    (state) => state.queueUploadCleanup,
  );

  // config.id collides across recipes (ids reset to n1 on import); use a
  // stable per-block uid instead. Generate one synchronously so the first
  // rendered drop zone cannot upload under a legacy node id.
  const uploadUid = config.unstructured_upload_uid?.trim() ?? "";
  const unstructuredFileCount = config.unstructured_file_ids?.length ?? 0;
  const generatedUploadUidRef = useRef<string | null>(null);
  if (
    mode === "unstructured" &&
    !uploadUid &&
    unstructuredFileCount === 0 &&
    generatedUploadUidRef.current === null
  ) {
    generatedUploadUidRef.current = makeUnstructuredUploadUid();
  }
  const uploadBlockId = resolveUnstructuredUploadBlockId({
    configId: config.id,
    uploadUid,
    generatedUploadUid: generatedUploadUidRef.current,
    unstructuredFileCount,
  });

  useEffect(() => {
    if (mode !== "unstructured") return;
    if (uploadUid) return;
    if (unstructuredFileCount > 0) return;
    const nextUid =
      generatedUploadUidRef.current ?? makeUnstructuredUploadUid();
    generatedUploadUidRef.current = nextUid;
    onUpdate({ unstructured_upload_uid: nextUid });
  }, [mode, uploadUid, unstructuredFileCount, onUpdate]);

  const prevModeRef = useRef(mode);
  useEffect(() => {
    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;
    setInspectError(null);
    setLocalFile(null);
    if (prevMode === "unstructured" && mode !== "unstructured") {
      setUnstructuredFiles([]);
    }
    if (prevMode !== "unstructured" && mode === "unstructured") {
      if (config.unstructured_file_ids?.length) {
        setUnstructuredFiles(
          config.unstructured_file_ids.map((id, i) => ({
            id,
            name: config.unstructured_file_names?.[i] ?? "Unknown",
            size: config.unstructured_file_sizes?.[i] ?? 0,
            status: "ok" as const,
          })),
        );
      } else {
        setUnstructuredFiles([]);
      }
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const didSyncFilesRef = useRef(false);
  useEffect(() => {
    if (!open) {
      didSyncFilesRef.current = false;
      return;
    }
    if (didSyncFilesRef.current) return;
    if (mode !== "unstructured") return;
    if (unstructuredFiles.length > 0) return;
    if (!config.unstructured_file_ids?.length) return;
    didSyncFilesRef.current = true;
    setUnstructuredFiles(
      config.unstructured_file_ids.map((id, i) => ({
        id,
        name: config.unstructured_file_names?.[i] ?? "Unknown",
        size: config.unstructured_file_sizes?.[i] ?? 0,
        status: "ok" as const,
      })),
    );
  }, [
    open,
    mode,
    unstructuredFiles.length,
    config.unstructured_file_ids,
    config.unstructured_file_names,
    config.unstructured_file_sizes,
  ]);

  const handleUnstructuredFilesChange = useCallback(
    (updater: FileEntry[] | ((prev: FileEntry[]) => FileEntry[])) => {
      setUnstructuredFiles((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const okFiles = next.filter((f) => f.status === "ok");
        queueMicrotask(() => {
          onUpdate({
            unstructured_file_ids: okFiles.map((f) => f.id),
            unstructured_file_names: okFiles.map((f) => f.name),
            unstructured_file_sizes: okFiles.map((f) => f.size),
          });
        });
        return next;
      });
    },
    [onUpdate],
  );

  useEffect(() => {
    setPreviewRows(config.seed_preview_rows ?? []);
    setExpandedPreviewRows({});
  }, [config.seed_preview_rows]);

  const samplingId = `${config.id}-sampling`;
  const selectionId = `${config.id}-selection`;
  const tokenId = `${config.id}-hf-token`;
  const datasetId = `${config.id}-hf-dataset`;
  const chunkSizeId = `${config.id}-chunk-size`;
  const chunkOverlapId = `${config.id}-chunk-overlap`;
  const [lastLoadedKey, setLastLoadedKey] = useState<string | null>(null);
  const wasOpenRef = useRef(open);

  const getCurrentLoadKey = useCallback((): string | null => {
    if (mode === "hf") {
      const dataset = config.hf_repo_id.trim();
      if (!dataset) return null;
      const token = config.hf_token?.trim() ?? "";
      return `hf:${dataset}|${token}`;
    }
    if (mode === "local") {
      if (!localFile) return null;
      return `local:${localFile.name}|${localFile.size}|${localFile.lastModified}`;
    }
    const okFiles = unstructuredFiles.filter((f) => f.status === "ok");
    if (okFiles.length === 0) return null;
    const { chunkSize, chunkOverlap } = resolveChunking(config);
    const fileKey = okFiles.map((f) => `${f.id}|${f.name}`).join(",");
    return `unstructured:${fileKey}|${chunkSize}|${chunkOverlap}`;
  }, [config, localFile, mode, unstructuredFiles]);

  const loadSeedMetadata = useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      const loadKey = getCurrentLoadKey();
      if (!opts?.silent) {
        setInspectError(null);
      }
      setIsInspecting(true);
      try {
        if (mode === "hf") {
          const datasetName = config.hf_repo_id.trim();
          if (!datasetName) {
            throw new Error(translate("uxRecipestudio.datasetRepoIsRequiredk8rjm"));
          }
          const response = await inspectSeedDataset({
            dataset_name: datasetName,
            hf_token: config.hf_token?.trim() || undefined,
            split: config.hf_split?.trim() || undefined,
            subset: config.hf_subset?.trim() || undefined,
            preview_size: 10,
          });
          // Queue the block's upload directory for deletion after the next
          // save; only uid-namespaced directories qualify (single owner).
          if (uploadUid && unstructuredFileCount > 0) {
            queueUploadCleanup(uploadUid);
          }
          onUpdate({
            hf_path: response.resolved_path,
            seed_columns: response.columns,
            seed_drop_columns: (config.seed_drop_columns ?? []).filter((name) =>
              response.columns.includes(name),
            ),
            seed_preview_rows: response.preview_rows ?? [],
            hf_split: response.split ?? "",
            hf_subset: response.subset ?? "",
            local_file_name: "",
            unstructured_upload_uid: "",
            unstructured_file_ids: [],
            unstructured_file_names: [],
            unstructured_file_sizes: [],
          });
          setPreviewRows(response.preview_rows ?? []);
          setLastLoadedKey(loadKey);
          return true;
        }

        if (mode === "local") {
          if (!localFile) {
            throw new Error(translate("uxRecipestudio.selectALocalCSVqjreg"));
          }
          if (localFile.size > LOCAL_SEED_UPLOAD_MAX_BYTES) {
            throw new Error(
              translate("uxRecipestudio.fileTooLargeMax586no", { p1: LOCAL_SEED_UPLOAD_MAX_LABEL }),
            );
          }
          const payload = await fileToBase64Payload(localFile);
          const response = await inspectSeedUpload({
            filename: localFile.name,
            content_base64: payload,
            preview_size: 10,
          });
          // Queue the block's upload directory for deletion after the next
          // save; only uid-namespaced directories qualify (single owner).
          if (uploadUid && unstructuredFileCount > 0) {
            queueUploadCleanup(uploadUid);
          }
          onUpdate({
            hf_path: response.resolved_path,
            seed_columns: response.columns,
            seed_drop_columns: (config.seed_drop_columns ?? []).filter((name) =>
              response.columns.includes(name),
            ),
            seed_preview_rows: response.preview_rows ?? [],
            hf_repo_id: "",
            hf_subset: "",
            hf_split: "",
            local_file_name: localFile.name,
            unstructured_upload_uid: "",
            unstructured_file_ids: [],
            unstructured_file_names: [],
            unstructured_file_sizes: [],
          });
          setPreviewRows(response.preview_rows ?? []);
          setLastLoadedKey(loadKey);
          return true;
        }

        if (mode === "unstructured") {
          const fileIds = unstructuredFiles
            .filter((f) => f.status === "ok")
            .map((f) => f.id);
          const fileNames = unstructuredFiles
            .filter((f) => f.status === "ok")
            .map((f) => f.name);

          if (fileIds.length === 0) {
            setInspectError(translate("uxRecipestudio.noFilesUploadedphn10"));
            return false;
          }

          const { chunkSize, chunkOverlap } = resolveChunking(config);
          const response = await inspectSeedUpload({
            block_id: uploadBlockId,
            file_ids: fileIds,
            file_names: fileNames,
            preview_size: 10,
            seed_source_type: "unstructured",
            unstructured_chunk_size: chunkSize,
            unstructured_chunk_overlap: chunkOverlap,
          });

          onUpdate({
            hf_path: response.resolved_path,
            resolved_paths: response.resolved_paths ?? [],
            seed_columns: response.columns,
            seed_preview_rows: response.preview_rows ?? [],
            unstructured_file_ids: fileIds,
            unstructured_file_names: fileNames,
            unstructured_file_sizes: unstructuredFiles
              .filter((f) => f.status === "ok")
              .map((f) => f.size),
          });
          setPreviewRows(response.preview_rows ?? []);
          setLastLoadedKey(loadKey);
          return true;
        }

        return false;
      } catch (error) {
        if (!opts?.silent) {
          setInspectError(
            getErrorMessage(error, translate("uxRecipestudio.failedToLoadSeed4mdyt")),
          );
        }
        setPreviewRows([]);
        return false;
      } finally {
        setIsInspecting(false);
      }
    },
    [
      config,
      getCurrentLoadKey,
      localFile,
      mode,
      onUpdate,
      queueUploadCleanup,
      unstructuredFiles,
      unstructuredFileCount,
      uploadBlockId,
      uploadUid,
    ],
  );

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!wasOpen || open || isInspecting) {
      return;
    }
    const key = getCurrentLoadKey();
    if (!key || key === lastLoadedKey) {
      return;
    }
    void loadSeedMetadata({ silent: true });
  }, [getCurrentLoadKey, isInspecting, lastLoadedKey, loadSeedMetadata, open]);

  const wasUploadingRef = useRef(false);
  useEffect(() => {
    if (mode !== "unstructured") return;
    const isUploading = unstructuredFiles.some((f) => f.status === "uploading");
    if (isUploading) {
      wasUploadingRef.current = true;
    } else if (wasUploadingRef.current) {
      wasUploadingRef.current = false;
      const hasOk = unstructuredFiles.some((f) => f.status === "ok");
      if (hasOk) {
        void loadSeedMetadata({ silent: true });
      }
    }
  }, [mode, unstructuredFiles, loadSeedMetadata]);

  const previewColumns = useMemo(() => {
    const loadedColumns = config.seed_columns ?? [];
    if (loadedColumns.length > 0) return loadedColumns;
    if (previewRows[0]) return Object.keys(previewRows[0]);
    return [];
  }, [config.seed_columns, previewRows]);
  const selectedSeedDropColumns = useMemo(
    () =>
      (config.seed_drop_columns ?? []).filter((name) => name.trim().length > 0),
    [config.seed_drop_columns],
  );
  const selectedSeedDropSet = useMemo(
    () => new Set(selectedSeedDropColumns),
    [selectedSeedDropColumns],
  );
  const rowHasExpandableText = useCallback(
    (row: Record<string, unknown>): boolean =>
      previewColumns.some((columnName) => {
        if (resolveImagePreview(row[columnName])) {
          return false;
        }
        return isExpandablePreviewValue(stringifyCell(row[columnName]));
      }),
    [previewColumns],
  );

  return (
    <Tabs defaultValue="config" className="w-full min-w-0">
      <TabsList className="w-full">
        <TabsTrigger value="config">Config</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="min-w-0 pt-3">
        <div className="space-y-3">
          {mode === "hf" && (
            <>
              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("studio.wizard.datasetTitle")}
                  htmlFor={datasetId}
                  hint={translate("uxRecipestudio.huggingFaceDatasetRepo1hmmo")}
                />
                <div className="flex items-center gap-2">
                  <HfDatasetCombobox
                    inputId={datasetId}
                    className="flex-1"
                    value={config.hf_repo_id}
                    accessToken={config.hf_token?.trim() || undefined}
                    placeholder={translate("uxRecipestudio.orgRepo1y5m0")}
                    onValueChange={(nextValue) =>
                      onUpdate({
                        hf_repo_id: nextValue,
                        hf_subset: "",
                        hf_split: "",
                        hf_path: "",
                        seed_columns: [],
                        seed_drop_columns: [],
                        seed_preview_rows: [],
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="nodrag shrink-0"
                    onClick={() => void loadSeedMetadata()}
                    disabled={isInspecting || !config.hf_repo_id.trim()}
                  >
                    {isInspecting ? "Loading..." : "Load"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("uxRecipestudio.hFTokenOptional1m5y0")}
                  htmlFor={tokenId}
                  hint={translate("uxRecipestudio.onlyNeededForPrivate1l0pl")}
                />
                <Input
                  id={tokenId}
                  className="nodrag"
                  data-reload-snapshot-sensitive
                  placeholder={translate("uxRecipestudio.hfdcawb")}
                  value={config.hf_token ?? ""}
                  onChange={(event) =>
                    onUpdate({ hf_token: event.target.value })
                  }
                />
              </div>
            </>
          )}

          {mode === "local" && (
            <div className="grid gap-1.5">
              <FieldLabel
                label={translate("uxRecipestudio.structuredFile19ma9")}
                hint={translate("uxRecipestudio.uploadCSVJSONJSONLdopgj")}
              />
              <div className="flex items-center gap-2">
                <Input
                  className="nodrag flex-1"
                  type="file"
                  accept={LOCAL_ACCEPT}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setLocalFile(file);
                    onUpdate({
                      hf_path: "",
                      seed_columns: [],
                      seed_drop_columns: [],
                      seed_preview_rows: [],
                      local_file_name: file?.name ?? "",
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="nodrag shrink-0"
                  onClick={() => void loadSeedMetadata()}
                  disabled={isInspecting || !localFile}
                >
                  {isInspecting ? "Loading..." : "Load"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{translate("uxRecipestudio.maxPerFileab914", { p1: LOCAL_SEED_UPLOAD_MAX_LABEL })}</p>
              {(localFile?.name || config.local_file_name?.trim()) && (
                <p className="text-xs text-muted-foreground">{translate("uxRecipestudio.selectedu2cg9", { p1: " " })}<span data-reload-snapshot-sensitive>
                    {localFile?.name ?? config.local_file_name?.trim()}
                  </span>
                </p>
              )}
            </div>
          )}

          {mode === "unstructured" && (
            <UnstructuredDropZone
              blockId={uploadBlockId}
              files={unstructuredFiles}
              onFilesChange={handleUnstructuredFilesChange}
              disabled={isInspecting}
            />
          )}

          {mode === "github_repo" && (
            <GithubRepoSeedForm config={config} onUpdate={onUpdate} />
          )}

          {inspectError && (
            <p className="text-xs text-red-600">{inspectError}</p>
          )}

          {mode !== "unstructured" && mode !== "github_repo" && (
            <div className="space-y-2 rounded-xl corner-squircle border border-border/60 p-3">
              <FieldLabel
                label={translate("uxRecipestudio.dropSpecificSeedColumns84vzz")}
                hint={translate("uxRecipestudio.droppedColumnsStayUsablea69oh")}
              />
              {previewColumns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {translate("uxRecipestudio.loadColumnsToSelect1qvf3")}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {previewColumns.map((columnName) => {
                    const checked = selectedSeedDropSet.has(columnName);
                    return (
                      <label
                        key={columnName}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            const isChecked = value === true;
                            const next = isChecked
                              ? Array.from(
                                  new Set([
                                    ...selectedSeedDropColumns,
                                    columnName,
                                  ]),
                                )
                              : selectedSeedDropColumns.filter(
                                  (name) => name !== columnName,
                                );
                            onUpdate({ seed_drop_columns: next });
                          }}
                        />
                        <span className="truncate">{columnName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Collapsible
            open={advancedOpen}
            onOpenChange={(openState) => onUpdate({ advancedOpen: openState })}
          >
            <CollapsibleTrigger asChild={true}>
              <CollapsibleSectionTriggerButton
                label={translate("uxRecipestudio.advancedSourceOptionsav858")}
                open={advancedOpen}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-3">
              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("uxRecipestudio.samplingStrategy11jzn")}
                  htmlFor={samplingId}
                  hint={translate("uxRecipestudio.orderedKeepsRowOrder166it")}
                />
                <Select
                  value={config.sampling_strategy}
                  onValueChange={(value) =>
                    onUpdate({
                      sampling_strategy: value as SeedSamplingStrategy,
                    })
                  }
                >
                  <SelectTrigger className="nodrag w-full" id={samplingId}>
                    <SelectValue placeholder={translate("uxRecipestudio.selectSamplinghz8pr")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <FieldLabel
                  label={translate("uxRecipestudio.selectionStrategybc6ec")}
                  htmlFor={selectionId}
                  hint={translate("uxRecipestudio.selectAllARowl0vq2")}
                />
                <Select
                  value={config.selection_type}
                  onValueChange={(value) =>
                    onUpdate({ selection_type: value as SeedSelectionType })
                  }
                >
                  <SelectTrigger className="nodrag w-full" id={selectionId}>
                    <SelectValue placeholder={translate("uxRecipestudio.selectSelectionl4a0f")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "unstructured" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <FieldLabel
                      label={translate("uxRecipestudio.chunkSize1wqbi")}
                      htmlFor={chunkSizeId}
                      hint={translate("uxRecipestudio.charactersPerChunk1nfmf")}
                    />
                    <Input
                      id={chunkSizeId}
                      className="nodrag"
                      inputMode="numeric"
                      value={
                        config.unstructured_chunk_size ??
                        String(DEFAULT_CHUNK_SIZE)
                      }
                      onChange={(event) =>
                        onUpdate({
                          unstructured_chunk_size: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel
                      label={translate("uxRecipestudio.chunkOverlap1vjnq")}
                      htmlFor={chunkOverlapId}
                      hint={translate("uxRecipestudio.sharedCharsBetweenAdjacentenxgs")}
                    />
                    <Input
                      id={chunkOverlapId}
                      className="nodrag"
                      inputMode="numeric"
                      value={
                        config.unstructured_chunk_overlap ??
                        String(DEFAULT_CHUNK_OVERLAP)
                      }
                      onChange={(event) =>
                        onUpdate({
                          unstructured_chunk_overlap: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {config.selection_type === "index_range" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <FieldLabel
                      label={translate("uxRecipestudio.start30xvg")}
                      hint={translate("uxRecipestudio.inclusiveStartRowIndexhktkn")}
                    />
                    <Input
                      className="nodrag"
                      inputMode="numeric"
                      value={config.selection_start ?? ""}
                      onChange={(event) =>
                        onUpdate({ selection_start: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel
                      label={translate("studio.dataset.endPlaceholder")}
                      hint={translate("uxRecipestudio.inclusiveEndRowIndexhgkgs")}
                    />
                    <Input
                      className="nodrag"
                      inputMode="numeric"
                      value={config.selection_end ?? ""}
                      onChange={(event) =>
                        onUpdate({ selection_end: event.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {config.selection_type === "partition_block" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <FieldLabel label={translate("uxRecipestudio.index1chtu")} hint={translate("uxRecipestudio.partitionIndexToLoaddigki")} />
                    <Input
                      className="nodrag"
                      inputMode="numeric"
                      value={config.selection_index ?? ""}
                      onChange={(event) =>
                        onUpdate({ selection_index: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel
                      label={translate("uxRecipestudio.partitions14sac")}
                      hint={translate("uxRecipestudio.totalNumberOfPartitions9cx37")}
                    />
                    <Input
                      className="nodrag"
                      inputMode="numeric"
                      value={config.selection_num_partitions ?? ""}
                      onChange={(event) =>
                        onUpdate({
                          selection_num_partitions: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </TabsContent>

      <TabsContent value="preview" className="min-w-0 pt-3">
        <div className="space-y-4">
          {previewRows.length === 0 ? (
            <div className="flex w-full items-center justify-center">
              <Empty className="max-w-lg">
                <EmptyHeader>
                  <EmptyTitle>{previewEmpty.title}</EmptyTitle>
                  <EmptyDescription>
                    {previewEmpty.description}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="text-xs text-muted-foreground">
                  {translate("uxRecipestudio.previewAppearsHereAfter39rq9")}
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{translate("uxRecipestudio.loadedColumnsnsj86", { p1: previewColumns.join(", ") || "None" })}</div>
              <div className="max-h-[calc(360px*var(--ui-space-scale,1))] overflow-y-auto overflow-x-hidden scroll-rounded rounded-xl corner-squircle border border-border/60">
                <Table className="corner-squircle min-w-max">
                  <TableHeader>
                    <TableRow>
                      {previewColumns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, rowIdx) => (
                      <TableRow
                        key={`row-${rowIdx}`}
                        className={cn(
                          rowHasExpandableText(row) &&
                            "cursor-pointer hover:bg-primary/[0.06]",
                          expandedPreviewRows[rowIdx] && "bg-primary/[0.05]",
                        )}
                        onClick={() => {
                          const canExpand = rowHasExpandableText(row);
                          if (!canExpand) {
                            return;
                          }
                          setExpandedPreviewRows((current) => ({
                            ...current,
                            [rowIdx]: !current[rowIdx],
                          }));
                        }}
                      >
                        {previewColumns.map((col) => (
                          <TableCell
                            key={`${rowIdx}-${col}`}
                            className="max-w-[calc(260px*var(--ui-space-scale,1))] whitespace-pre-wrap break-words text-xs"
                          >
                            {(() => {
                              const imagePreview = resolveImagePreview(
                                row[col],
                              );
                              if (imagePreview?.kind === "ready") {
                                return (
                                  <img
                                    src={imagePreview.src}
                                    alt={translate("uxRecipestudio.previewcwc67", { p1: col })}
                                    loading="lazy"
                                    className="h-20 w-auto max-w-[calc(220px*var(--ui-space-scale,1))] rounded-md border border-border/60 bg-muted/20 object-contain"
                                  />
                                );
                              }
                              if (imagePreview?.kind === "too_large") {
                                return translate("uxRecipestudio.imageTooLargeToxqax5");
                              }
                              const value = stringifyCell(row[col]);
                              const rowHasExpandableCell =
                                rowHasExpandableText(row);
                              const rowExpanded = Boolean(
                                expandedPreviewRows[rowIdx],
                              );
                              return rowHasExpandableCell && !rowExpanded
                                ? truncatePreviewValue(value)
                                : value;
                            })()}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
