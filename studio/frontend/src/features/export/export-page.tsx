// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { useAppShellReadySignal } from "@/components/app-readiness";
import { SectionCard } from "@/components/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlatformStore } from "@/config/env";
import { prepareHfTokenForUse } from "@/features/hf-auth";
import { hfApiToken, useHfTokenStore, useHubModelSearch } from "@/features/hub";
import { confirmRemoteCodeIfNeeded } from "@/features/security";
import { GuidedTour, useGuidedTourController } from "@/features/tour";
import type { LocalModelInfo } from "@/features/training";
import { useDebouncedValue, useHfTokenValidation } from "@/hooks";
import { useHardwareInfo } from "@/hooks/use-hardware-info";
import { translate, useT } from "@/i18n";
import { ChevronDownStandardIcon } from "@/lib/chevron-icons";
import {
  AlertCircleIcon,
  FolderSearchIcon,
  InformationCircleIcon,
  Key01Icon,
  PackageIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  type DecisionExportInfo,
  type DiffusionLmExportInfo,
  type ModelCheckpoints,
  fetchCheckpointExportProbe,
} from "./api/export-api";
import { adapterCompatibilityTip, type AdapterFormat } from "./constants";
import { ExportRunPanel } from "./components/export-run-panel";
import { ImageLoraExportCard } from "./components/image-lora-export-card";
import { MethodPicker } from "./components/method-picker";
import { Q4nxConvertCard } from "./components/q4nx-convert-card";
import { QuantPicker } from "./components/quant-picker";
import {
  EXPORT_METHODS,
  type ExportMethod,
  GUIDE_STEPS,
  MERGED_FORMATS,
  type MergedFormatOption,
  Q4NX_SOURCE_QUANTS,
  QUANT_OPTIONS,
  buildQuantSizeLabels,
  getEstimatedSize,
  mergedFormatPayload,
} from "./constants";
import {
  getCachedCheckpoints,
  getCachedLocalModels,
  refreshCheckpoints,
  refreshLocalModels,
} from "./export-navigation-cache";
import { confirmLlmCompressorInstallIfNeeded } from "./hooks/use-llm-compressor-consent";
import { useExportSizeEstimate } from "./hooks/use-export-size-estimate";
import { saveDirectoryField } from "./lib/save-directory";
import {
  isExportPanelActive,
  useExportRuntimeStore,
} from "./stores/export-runtime-store";
import { exportTourSteps } from "./tour";

const SEARCH_INPUT_REASONS = new Set([
  "input-change",
  "input-paste",
  "input-clear",
]);

// GGUF LoRA output float types (Q8_0 default). Q8_0 falls back to F16 per tensor for dims not divisible by 32; no "auto".
const LORA_GGUF_OUTTYPES = ["q8_0", "f16", "bf16", "f32"] as const;

type SourceTab = "local" | "checkpoint" | "hf";
type SourceMode = "checkpoint" | "model";

function safePathSegment(
  value: string | null | undefined,
  fallback = "model",
  maxLength = 250,
): string {
  const safe = (value ?? "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, maxLength)
    .replace(/[._-]+$/g, "");
  return safe || fallback;
}

function buildRelativeSaveDirectory(
  exportMethod: ExportMethod | null,
  sourceMode: SourceMode,
  sourceBaseModelName: string,
  selectedModelIdx: string | null,
  checkpoint: string | null,
): string {
  if (exportMethod === "gguf") {
    const rawName =
      sourceMode === "checkpoint"
        ? (checkpoint ?? selectedModelIdx ?? sourceBaseModelName)
        : sourceBaseModelName;
    return `${safePathSegment(rawName)}-GGUF`;
  }
  // Merged / LoRA: a checkpoint keeps the "<run>/<checkpoint>" layout under outputs.
  if (sourceMode === "checkpoint" && selectedModelIdx && checkpoint) {
    return `${selectedModelIdx}/${checkpoint}`;
  }
  // Local / HF source (no checkpoint): name from the model id to avoid "model/null".
  const rawName =
    sourceMode === "checkpoint"
      ? (checkpoint ?? selectedModelIdx ?? sourceBaseModelName)
      : sourceBaseModelName;
  return `${safePathSegment(rawName)}-${exportMethod === "lora" ? "adapter" : "merged"}`;
}

function siblingGgufDirectory(sourcePath: string): string | null {
  const trimmed = sourcePath.trim().replace(/[\\/]+$/, "");
  if (!trimmed) return null;
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  // Lowercase `_gguf` matches the backend's intermediate dir; `_GGUF` would relocate+delete it.
  if (slash < 0) return `${trimmed}_gguf`;
  const parent =
    slash === 0 || (slash === 2 && /^[A-Za-z]:/.test(trimmed))
      ? trimmed.slice(0, slash + 1)
      : trimmed.slice(0, slash);
  const name = trimmed.slice(slash + 1);
  if (!name) return null;
  const sep =
    parent.endsWith("/") || parent.endsWith("\\")
      ? ""
      : trimmed.includes("\\")
        ? "\\"
        : "/";
  return `${parent}${sep}${name}_gguf`;
}

export function ExportPage() {
  const t = useT();
  const signalReady = useAppShellReadySignal();
  const { hfToken, setHfToken } = useHfTokenStore(
    useShallow((s) => ({
      hfToken: s.token,
      setHfToken: s.setToken,
    })),
  );

  const [models, setModels] = useState<ModelCheckpoints[]>(
    () => getCachedCheckpoints() ?? [],
  );
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(
    getCachedCheckpoints() === null,
  );
  const [checkpointError, setCheckpointError] = useState<string | null>(null);

  const [selectedModelIdx, setSelectedModelIdx] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("checkpoint");
  const [modelSource, setModelSource] = useState<"hf" | "local">("hf");
  const [modelInput, setModelInput] = useState("");
  const [selectedSourceModel, setSelectedSourceModel] = useState<string | null>(
    null,
  );
  const [localModelInput, setLocalModelInput] = useState("");
  const [localModels, setLocalModels] = useState<LocalModelInfo[]>(
    () => getCachedLocalModels() ?? [],
  );
  const [isLoadingLocalModels, setIsLoadingLocalModels] = useState(
    getCachedLocalModels() === null,
  );
  const [localModelsError, setLocalModelsError] = useState<string | null>(null);
  const debouncedModelQuery = useDebouncedValue(modelInput);
  const debouncedHfToken = useDebouncedValue(hfToken, 500);

  // Seed the method + quants from a live run so navigating away and back (which remounts this
  // page) keeps the selection. The run lives in the global store; only this form state is local.
  const [exportMethod, setExportMethod] = useState<ExportMethod | null>(() => {
    const s = useExportRuntimeStore.getState();
    return isExportPanelActive(s) && s.summary ? s.summary.method : null;
  });
  const [quantLevels, setQuantLevels] = useState<string[]>(() => {
    const s = useExportRuntimeStore.getState();
    return isExportPanelActive(s) && s.summary?.method === "gguf"
      ? s.summary.quantLevels
      : [];
  });
  // GGUF importance matrix (required for the IQ quants) and merged-export precision.
  const [useImatrix, setUseImatrix] = useState(false);
  const [npuQ4nx, setNpuQ4nx] = useState(false);
  const [customImatrix, setCustomImatrix] = useState({ sourceKey: "", path: "" });
  // Merged precision: one or more MERGED_FORMATS values exported in one run; seeded like exportMethod.
  const [selectedFormats, setSelectedFormats] = useState<string[]>(() => {
    const s = useExportRuntimeStore.getState();
    return isExportPanelActive(s) &&
      s.summary?.method === "merged" &&
      s.summary.mergedFormats.length > 0
      ? s.summary.mergedFormats
      : ["16-bit"];
  });
  // LoRA-only export: optionally also emit a GGUF LoRA adapter, and its output float type.
  const [loraAsGguf, setLoraAsGguf] = useState(false);
  const [adapterFormat, setAdapterFormat] = useState<AdapterFormat>("mlx");
  const [loraGgufOuttype, setLoraGgufOuttype] = useState<string>("q8_0");
  // GGUF method: export the full model as GGUF quants, or (for an adapter checkpoint) a GGUF LoRA.
  const [ggufTarget, setGgufTarget] = useState<"model" | "lora">("model");

  const hardware = useHardwareInfo();
  // On Mac, GGUF LoRA adapters ship through the LoRA method's toggle, not the GGUF method.
  const isMacHost = usePlatformStore((s) => s.deviceType) === "mac";
  const torchaoUnavailable = !hardware.torchaoExportSupported;
  // Real CUDA (not ROCm); gates the NVIDIA-only compressed-tensors formats.
  const hasNvidia = hardware.cuda != null && hardware.rocm == null;
  // Only gray out on an authoritative unsupported response; the backend supplies the reason.
  const exportUnsupported =
    hardware.loaded && hardware.exportSupported === false;
  const exportUnsupportedMessage =
    hardware.exportUnsupportedMessage ??
    translate("uxExport.exportRequiresASupported1ct1f");
  const availableFormats = useMemo<MergedFormatOption[]>(
    () =>
      MERGED_FORMATS.filter((f) => {
        // compressed-tensors (llm-compressor) is the NVIDIA path; shown only on an NVIDIA GPU.
        if (f.backend === "compressed") return hasNvidia;
        // Portable torchao is the fallback for hosts without the NVIDIA compressed path. Hidden on
        // NVIDIA (use compressed-tensors), macOS/MLX (rejected) and where torchao cannot load.
        if (f.backend === "torchao") return !hasNvidia && !isMacHost && !torchaoUnavailable;
        // Plain 16-bit is available everywhere.
        return true;
      }),
    [hasNvidia, isMacHost, torchaoUnavailable],
  );
  const toggleFormat = useCallback((value: string) => {
    setSelectedFormats((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, []);
  // Drop picks the gate removed, only once hardware is loaded: before that hasNvidia reads false.
  useEffect(() => {
    if (!hardware.loaded) return;
    const allowed = new Set(availableFormats.map((f) => f.value));
    setSelectedFormats((prev) => {
      const next = prev.filter((v) => allowed.has(v));
      return next.length === prev.length ? prev : next;
    });
  }, [availableFormats, hardware.loaded]);
  // IQ quants are imatrix-only: force imatrix on when one is selected, else llama.cpp rejects it.
  const requiresImatrix = quantLevels.some(
    (q) => QUANT_OPTIONS.find((o) => o.value === q)?.imatrix,
  );
  const effectiveImatrix = useImatrix || requiresImatrix;
  const q4nxSourceSelected = quantLevels.some((q) =>
    Q4NX_SOURCE_QUANTS.includes(q),
  );

  // Whether the inline export panel is expanded. The panel also shows itself whenever a run is
  // active/terminal (see `panelActive`), so it survives navigation even though this flag resets.
  const [panelOpen, setPanelOpen] = useState(false);

  const [destination, setDestination] = useState<"local" | "hub">("local");
  // The converter writes beside the GGUFs, so a Hub-only export has nowhere to put it.
  const effectiveNpuQ4nx =
    npuQ4nx && q4nxSourceSelected && destination === "local";
  const [customSaveDirectory, setCustomSaveDirectory] = useState<string | null>(
    null,
  );
  const [hfUsername, setHfUsername] = useState("");
  const [modelName, setModelName] = useState("");
  const [privateRepo, setPrivateRepo] = useState(false);

  // Export run state lives in the global runtime store so it keeps streaming in the background.
  const runExport = useExportRuntimeStore((s) => s.runExport);
  const resetExportRun = useExportRuntimeStore((s) => s.reset);
  const isExporting = useExportRuntimeStore((s) => s.isExporting);
  const panelActive = useExportRuntimeStore(isExportPanelActive);

  const hfComboboxAnchorRef = useRef<HTMLDivElement>(null);
  const localComboboxAnchorRef = useRef<HTMLDivElement>(null);
  const selectingHfModelRef = useRef(false);
  const hfModelInputRef = useRef("");
  const localModelInputRef = useRef("");

  const tour = useGuidedTourController({
    id: "export",
    steps: exportTourSteps,
  });

  useEffect(() => {
    let cancelled = false;
    const hadCache = getCachedCheckpoints() !== null;
    refreshCheckpoints()
      .then((models) => {
        if (!cancelled) {
          setModels(models);
        }
      })
      .catch((err) => {
        if (!cancelled && !hadCache) {
          setCheckpointError(
            err instanceof Error ? err.message : translate("uxExport.failedToLoadCheckpointsd2ze0"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCheckpoints(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply the ?run= deep link once its run appears in the checkpoint list: select the run and
  // default to GGUF. The main checkpoint is auto-selected below, after the model-change effect.
  const { run: preselectRun, imageLora: preselectImageLora } = useSearch({ from: "/export" });
  const appliedRunRef = useRef<string | null>(null);
  useEffect(() => {
    if (!preselectRun) {
      // Deep link cleared (e.g. navigated to /export via the sidebar): stop preselecting that run.
      appliedRunRef.current = null;
      return;
    }
    if (models.length === 0) return;
    if (appliedRunRef.current === preselectRun) return;
    const match = models.find((m) => m.name === preselectRun);
    if (!match) return;
    appliedRunRef.current = preselectRun;
    setSourceMode("checkpoint");
    setSelectedModelIdx(match.name);
    setExportMethod("gguf");
  }, [preselectRun, models]);

  useEffect(() => {
    let cancelled = false;
    const hadCache = getCachedLocalModels() !== null;
    void refreshLocalModels()
      .then((models) => {
        if (cancelled) return;
        setLocalModels(models);
      })
      .catch((error) => {
        if (cancelled || hadCache) return;
        setLocalModelsError(
          error instanceof Error
            ? error.message
            : translate("uxExport.failedToLoadLocalkupct"),
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingLocalModels(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadReadySent = useRef(false);
  useEffect(() => {
    if (
      loadingCheckpoints ||
      isLoadingLocalModels ||
      reloadReadySent.current
    ) {
      return;
    }
    reloadReadySent.current = true;
    signalReady();
  }, [isLoadingLocalModels, loadingCheckpoints, signalReady]);

  const selectedModelData = useMemo(
    () =>
      selectedModelIdx != null
        ? (models.find((m) => m.name === selectedModelIdx) ?? null)
        : null,
    [models, selectedModelIdx],
  );

  const checkpointsForModel = useMemo(
    () => selectedModelData?.checkpoints ?? [],
    [selectedModelData],
  );

  const baseModelName = selectedModelData?.base_model ?? "—";
  const isAdapter = !!selectedModelData?.peft_type;
  const isQuantized = !!selectedModelData?.is_quantized;
  // isAdapter / isQuantized come from the checkpoint's metadata and are stale in "model" source
  // mode, so treat both as false outside checkpoint mode to avoid wrongly gating the methods.
  const effectiveIsAdapter = sourceMode === "checkpoint" && isAdapter;
  const effectiveIsQuantized = sourceMode === "checkpoint" && isQuantized;
  const loraRank = selectedModelData?.lora_rank ?? null;
  const trainingMethodLabel = selectedModelData?.peft_type
    ? "LoRA / QLoRA"
    : "Full Fine-tune";
  const sourceBaseModelName =
    sourceMode === "model" ? (selectedSourceModel ?? "—") : baseModelName;

  // For a full fine-tune checkpoint the weights live in the checkpoint dir itself (its base_model
  // may be unsizeable), so size that dir; LoRA adapters merge into the base model.
  const sizeTargetModel = useMemo(() => {
    if (sourceMode === "checkpoint" && !isAdapter) {
      const cp = checkpointsForModel.find((c) => c.display_name === checkpoint);
      if (cp?.path) {
        return cp.path;
      }
    }
    return sourceBaseModelName;
  }, [
    sourceMode,
    isAdapter,
    checkpointsForModel,
    checkpoint,
    sourceBaseModelName,
  ]);

  // Real (MoE-aware) fp16 size, used to scale the GGUF quant estimates.
  const { fp16Bytes } = useExportSizeEstimate(
    sizeTargetModel,
    debouncedHfToken,
  );
  const quantSizeLabels = useMemo(
    () => buildQuantSizeLabels(fp16Bytes),
    [fp16Bytes],
  );

  const {
    results: hfResults,
    isLoading: isLoadingHfModels,
    error: hfSearchError,
  } = useHubModelSearch(debouncedModelQuery, {
    accessToken: hfApiToken(debouncedHfToken),
    excludeGguf: true,
    // Curated LAiM listing by default; a typed query searches the whole Hub (LAiM first).
    ownerScope: debouncedModelQuery.trim() ? "all" : "LAiM",
  });
  const { error: tokenValidationError, isChecking: isCheckingToken } =
    useHfTokenValidation(hfToken);

  const hfResultIds = useMemo(() => {
    const ids = hfResults.map((r) => r.id);
    if (
      selectedSourceModel &&
      modelSource === "hf" &&
      !ids.includes(selectedSourceModel)
    ) {
      ids.push(selectedSourceModel);
    }
    return ids;
  }, [hfResults, modelSource, selectedSourceModel]);

  const exportableLocalModels = useMemo(
    () =>
      localModels.filter((m) => {
        if (m.path.endsWith(".gguf")) return false;
        if (m.id.toLowerCase().includes("-gguf")) return false;
        return true;
      }),
    [localModels],
  );

  const localMetaById = useMemo(() => {
    const map = new Map<string, LocalModelInfo>();
    for (const model of exportableLocalModels) map.set(model.id, model);
    return map;
  }, [exportableLocalModels]);

  // Decision models (Clef / Laya) are local run folders; the backend says which and what they allow.
  const decisionProbePath = useMemo(() => {
    if (sourceMode === "checkpoint") {
      return (
        checkpointsForModel.find((c) => c.display_name === checkpoint)?.path ??
        null
      );
    }
    if (modelSource !== "local" || !selectedSourceModel) {
      return null;
    }
    return localMetaById.get(selectedSourceModel)?.path ?? selectedSourceModel;
  }, [
    sourceMode,
    checkpointsForModel,
    checkpoint,
    modelSource,
    selectedSourceModel,
    localMetaById,
  ]);
  const [decisionState, setDecisionState] = useState<{
    path: string;
    info: DecisionExportInfo | null;
    diffusionLm?: DiffusionLmExportInfo | null;
  } | null>(null);
  useEffect(() => {
    if (!decisionProbePath) {
      return;
    }
    const controller = new AbortController();
    fetchCheckpointExportProbe(decisionProbePath, controller.signal)
      .then(({ decision: info, diffusionLm }) => {
        setDecisionState({ path: decisionProbePath, info, diffusionLm });
        if (!info) {
          return;
        }
        // A decision model exports to GGUF only, saved locally in its run folder.
        const allowed = new Set(info.quantizations);
        setExportMethod("gguf");
        setGgufTarget("model");
        setDestination("local");
        setQuantLevels((prev) => {
          const kept = prev.filter((q) => allowed.has(q));
          if (kept.length === prev.length && kept.length > 0) {
            return prev;
          }
          return kept.length > 0 ? kept : [info.default_quantization];
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDecisionState({ path: decisionProbePath, info: null });
        }
      });
    return () => controller.abort();
  }, [decisionProbePath]);
  const decisionInfo =
    decisionProbePath && decisionState?.path === decisionProbePath
      ? decisionState.info
      : null;
  const isDecision = decisionInfo != null;
  // Text-diffusion LMs: no GGUF (llama.cpp would serve them left to right); DiffusionGemma also no merge.
  const diffusionLmInfo =
    decisionProbePath && decisionState?.path === decisionProbePath
      ? (decisionState.diffusionLm ?? null)
      : null;
  const diffusionDisabledMethods = useMemo<ExportMethod[]>(
    () => diffusionLmInfo?.disabled_methods ?? [],
    [diffusionLmInfo],
  );
  const decisionIneligible = decisionInfo?.eligible === false;
  const decisionQuantOptions = useMemo(
    () =>
      (decisionInfo?.quantizations ?? []).map((q) => ({
        value: q,
        label: q.toUpperCase(),
        recommended: q === decisionInfo?.default_quantization,
      })),
    [decisionInfo],
  );
  const decisionExistingQuants =
    decisionInfo?.existing_export?.quantizations ?? [];

  const localResultIds = useMemo(() => {
    const ids = exportableLocalModels.map((model) => model.id);
    const manual = localModelInput.trim();
    if (manual && !ids.includes(manual)) {
      ids.unshift(manual);
    }
    return ids;
  }, [exportableLocalModels, localModelInput]);

  const localFilteredIds = useMemo(() => {
    const q = localModelInput.trim().toLowerCase();
    if (!q) return localResultIds;
    return localResultIds.filter((id) => {
      const meta = localMetaById.get(id);
      if (id.toLowerCase().includes(q)) return true;
      if (meta?.display_name.toLowerCase().includes(q)) return true;
      if (meta?.path.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [localMetaById, localModelInput, localResultIds]);

  const exportGuideSteps = useMemo(
    () =>
      sourceMode === "model"
        ? [
            "Select a Hugging Face or local model to export from",
            translate("uxExport.gGUFIsUsedForw9v6w"),
            translate("uxExport.pickOneOrMoreidscs"),
            translate("uxExport.clickExportAndChooseyy9zg"),
            translate("uxExport.testYourModelAndoa13h"),
          ]
        : GUIDE_STEPS,
    [sourceMode],
  );
  const sourceTab: SourceTab =
    sourceMode === "checkpoint" ? "checkpoint" : modelSource;

  useEffect(() => {
    setCheckpoint(null);
  }, [selectedModelIdx]);

  // Default to the newest checkpoint when none is chosen. Declared after the reset effect above
  // so it runs last; covers both a ?run= deep link and a plain finetune.
  useEffect(() => {
    if (sourceMode !== "checkpoint") return;
    if (checkpoint != null || checkpointsForModel.length === 0) return;
    setCheckpoint(checkpointsForModel[0].display_name);
  }, [sourceMode, selectedModelIdx, checkpoint, checkpointsForModel]);

  // Auto-reset export method if incompatible with the selected model type
  useEffect(() => {
    // Only LoRA needs a real adapter; Merged and GGUF work for non-PEFT base models too.
    if (!effectiveIsAdapter && exportMethod === "lora") {
      setExportMethod(null);
    }
    // Quantized non-PEFT models can't export to any format
    if (!effectiveIsAdapter && effectiveIsQuantized && exportMethod !== null) {
      setExportMethod(null);
    }
    if (
      exportMethod !== null &&
      diffusionDisabledMethods.includes(exportMethod)
    ) {
      setExportMethod(null);
    }
    if (diffusionDisabledMethods.includes("gguf") && loraAsGguf) {
      setLoraAsGguf(false);
    }
    // The GGUF LoRA target only applies to an adapter checkpoint on a non-Mac host.
    if ((!effectiveIsAdapter || isMacHost) && ggufTarget !== "model") {
      setGgufTarget("model");
    }
  }, [
    effectiveIsAdapter,
    effectiveIsQuantized,
    exportMethod,
    isMacHost,
    ggufTarget,
    diffusionDisabledMethods,
    loraAsGguf,
  ]);

  const handleSourceTabChange = useCallback((next: string) => {
    if (next === "checkpoint") {
      setSourceMode("checkpoint");
    } else if (next === "hf" || next === "local") {
      setSourceMode("model");
      setModelSource(next);
      // Don't force GGUF: Local / HF sources can export Merged too; a stale LoRA pick auto-resets.
    } else {
      return;
    }
    setSelectedSourceModel(null);
    setLocalModelInput("");
    setModelInput("");
    hfModelInputRef.current = "";
    localModelInputRef.current = "";
  }, []);

  useEffect(() => {
    setSelectedSourceModel(null);
    setLocalModelInput("");
    setModelInput("");
  }, [modelSource]);

  useEffect(() => {
    hfModelInputRef.current = modelInput;
  }, [modelInput]);

  useEffect(() => {
    localModelInputRef.current = localModelInput;
  }, [localModelInput]);

  const handleMethodChange = (method: ExportMethod) => {
    setExportMethod(method);
    if (method !== "gguf") {
      setQuantLevels([]);
    }
  };

  const estimatedSize = getEstimatedSize(exportMethod, quantLevels, fp16Bytes);
  const selectedExportSource =
    sourceMode === "checkpoint" ? checkpoint : selectedSourceModel;
  // Derived, not reset in an effect: an imatrix is calibrated for one model, so another source must not inherit it.
  const imatrixSourceKey = JSON.stringify([
    sourceTab,
    sourceMode === "checkpoint" ? selectedModelIdx : null,
    selectedExportSource,
  ]);
  const imatrixPath =
    customImatrix.sourceKey === imatrixSourceKey ? customImatrix.path : "";
  const defaultSaveDirectory = useMemo(() => {
    const relative = buildRelativeSaveDirectory(
      exportMethod,
      sourceMode,
      sourceBaseModelName,
      selectedModelIdx,
      checkpoint,
    );
    if (
      exportMethod === "gguf" &&
      sourceMode === "model" &&
      modelSource === "local" &&
      selectedSourceModel
    ) {
      const localModel = localMetaById.get(selectedSourceModel);
      if (
        localModel &&
        (localModel.source === "models_dir" || localModel.source === "custom")
      ) {
        return siblingGgufDirectory(localModel.path) ?? relative;
      }
    }
    // Mac PEFT / GGUF adapters get their own folder: one folder holds one adapter format.
    if (
      isMacHost &&
      exportMethod === "lora" &&
      (loraAsGguf || adapterFormat === "peft")
    ) {
      return `${relative}-peft`;
    }
    return relative;
  }, [
    adapterFormat,
    checkpoint,
    exportMethod,
    isMacHost,
    localMetaById,
    loraAsGguf,
    modelSource,
    selectedModelIdx,
    selectedSourceModel,
    sourceBaseModelName,
    sourceMode,
  ]);
  const { inputValue: saveDirectoryInput, saveDirectory } = saveDirectoryField(
    customSaveDirectory,
    defaultSaveDirectory,
  );
  // Each merged format uploads a full model to the repo root, so several to one repo would collide.
  // GGUF method exporting an adapter checkpoint as a GGUF LoRA; reuses the LoRA export path.
  const ggufAsLora =
    exportMethod === "gguf" &&
    ggufTarget === "lora" &&
    effectiveIsAdapter &&
    !isMacHost;

  // Restrict a Hub merged export to a single format; multi-format stays available for local export.
  const hubMultiFormat =
    destination === "hub" &&
    exportMethod === "merged" &&
    selectedFormats.length > 1;

  const canExport = !!(
    selectedExportSource &&
    exportMethod &&
    !exportUnsupported &&
    !diffusionDisabledMethods.includes(exportMethod) &&
    !hubMultiFormat &&
    (exportMethod !== "gguf" || ggufAsLora || quantLevels.length > 0) &&
    (exportMethod !== "merged" || selectedFormats.length > 0) &&
    (!isDecision || (exportMethod === "gguf" && !decisionIneligible))
  );

  const applyHfSourceModel = useCallback((value: string) => {
    const next = value.trim();
    setModelInput(next);
    setSelectedSourceModel(next || null);
  }, []);

  const handleHfSourceModelSelect = useCallback((id: string | null) => {
    selectingHfModelRef.current = true;
    const next = id ?? "";
    hfModelInputRef.current = next;
    setModelInput(next);
    setSelectedSourceModel(id);
  }, []);

  const handleHfSourceInputChange = useCallback(
    (value: string, eventDetails?: { reason?: string }) => {
      hfModelInputRef.current = value;
      if (selectingHfModelRef.current) {
        selectingHfModelRef.current = false;
        return;
      }
      if (!SEARCH_INPUT_REASONS.has(eventDetails?.reason ?? "")) {
        return;
      }
      setModelInput(value);
      if (value.trim() === "") {
        setSelectedSourceModel(null);
      }
    },
    [],
  );

  const applyLocalSourceModel = useCallback((value: string) => {
    const next = value.trim();
    setLocalModelInput(next);
    setSelectedSourceModel(next || null);
  }, []);

  useEffect(() => {
    setCustomSaveDirectory(null);
  }, [
    checkpoint,
    exportMethod,
    modelSource,
    selectedModelIdx,
    selectedSourceModel,
    sourceMode,
  ]);

  const handleLocalSourceInputChange = useCallback(
    (value: string, eventDetails?: { reason?: string }) => {
      localModelInputRef.current = value;
      if (!SEARCH_INPUT_REASONS.has(eventDetails?.reason ?? "")) {
        return;
      }
      setLocalModelInput(value);
      if (value.trim() === "") {
        setSelectedSourceModel(null);
      }
    },
    [],
  );

  // ---- Export handlers ----
  // Assemble the run params and hand off to the global runtime store, which drives the run.
  const handleStart = useCallback(async () => {
    const source =
      sourceMode === "checkpoint" ? checkpoint : selectedSourceModel;
    if (!source || !exportMethod) return;
    // No supported accelerator (or PyTorch/MLX missing): the backend would reject anyway; don't submit.
    if (exportUnsupported) return;
    if (diffusionDisabledMethods.includes(exportMethod)) return;
    // GGUF with no quant, or merged with no format, would run an empty export; require at least one.
    if (exportMethod === "gguf" && !ggufAsLora && quantLevels.length === 0)
      return;
    if (exportMethod === "merged" && selectedFormats.length === 0) return;
    // A Hub merged push writes each format to the repo root; several would collide (mirrors canExport).
    if (hubMultiFormat) return;
    if (isDecision && (exportMethod !== "gguf" || decisionIneligible)) {
      return;
    }

    const selectedCp =
      sourceMode === "checkpoint"
        ? checkpointsForModel.find((cp) => cp.display_name === checkpoint)
        : null;
    if (sourceMode === "checkpoint" && !selectedCp) return;
    const checkpointPath = selectedCp?.path ?? null;

    const pushToHub = destination === "hub";
    if (pushToHub && !isDecision && (!hfUsername.trim() || !modelName.trim()))
      return;
    const preparedToken = await prepareHfTokenForUse(hfToken, {
      allowAnonymous: !pushToHub,
    });
    if (!preparedToken.proceed) return;
    const actionHfToken = preparedToken.token ?? "";

    const repoId =
      pushToHub && hfUsername.trim() && modelName.trim()
        ? `${hfUsername.trim()}/${modelName.trim()}`
        : undefined;
    const token = pushToHub && actionHfToken ? actionHfToken : undefined;
    // The GGUF method with the LoRA target reuses the LoRA-adapter export path.
    const effectiveMethod: ExportMethod = ggufAsLora ? "lora" : exportMethod;
    const emitLoraGguf = ggufAsLora || (effectiveMethod === "lora" && loraAsGguf);
    const methodLabel = isDecision
      ? t("exportDecision.methodLabel")
      : ggufAsLora
        ? translate("uxExport.gGUFLoRAAdapterhu9rh")
        : (EXPORT_METHODS.find((m) => m.value === exportMethod)?.title ??
          exportMethod);
    const adapterExport = sourceMode === "checkpoint" && isAdapter;

    // Consent gate for an HF source's custom (auto_map) code, before handing off to runExport.
    // A local checkpoint/model the user exported is trusted by default.
    let trustRemoteCode = modelSource !== "hf";
    let approvedRemoteCodeFingerprint: string | null = null;
    if (sourceMode !== "checkpoint") {
      const remoteCodeOk = await confirmRemoteCodeIfNeeded({
        modelName: source,
        hfToken: actionHfToken || null,
        // An HF source can need trust_remote_code via its YAML default with no auto_map to review;
        // signal it so a YAML-only model does not export with it false.
        requiresTrustRemoteCode: modelSource === "hf",
        onApprove: (fingerprint) => {
          trustRemoteCode = true;
          approvedRemoteCodeFingerprint = fingerprint;
        },
      });
      if (!remoteCodeOk) return;
    }

    let installMissingDependencies = false;
    if (effectiveMethod === "merged") {
      const llmCompressor = await confirmLlmCompressorInstallIfNeeded(
        selectedFormats,
      );
      if (!llmCompressor.ok) return;
      installMissingDependencies = llmCompressor.installMissingDependencies;
    }

    void runExport({
      sourceMode,
      checkpointPath,
      source,
      modelSource,
      trustRemoteCode,
      approvedRemoteCodeFingerprint,
      loadToken: actionHfToken || null,
      exportMethod: effectiveMethod,
      isAdapter: adapterExport,
      quantLevels,
      useImatrix: isDecision ? false : effectiveImatrix,
      imatrixPath: isDecision ? "" : imatrixPath,
      npuQ4nx: isDecision ? false : effectiveNpuQ4nx,
      decisionOutputLabel: isDecision
        ? (quantizations: string[]) =>
            t("exportDecision.outputLabel", {
              quantizations: quantizations.join(", "),
            })
        : undefined,
      mergedSelections: selectedFormats.map((v) => ({
        ...mergedFormatPayload(v),
        label: MERGED_FORMATS.find((f) => f.value === v)?.label ?? v,
      })),
      loraGguf: emitLoraGguf,
      loraGgufOuttype,
      adapterFormat: isMacHost && !emitLoraGguf ? adapterFormat : undefined,
      saveDirectory,
      destination,
      repoId,
      token,
      privateRepo,
      installMissingDependencies,
      baseModelId: selectedModelData?.base_model ?? undefined,
      summary: {
        baseModelName: sourceBaseModelName,
        checkpointLabel: selectedExportSource,
        methodLabel,
        method: effectiveMethod,
        quantLevels,
        mergedFormats: exportMethod === "merged" ? selectedFormats : [],
        destination,
      },
    });
  }, [
    checkpoint,
    checkpointsForModel,
    sourceMode,
    selectedSourceModel,
    selectedModelData,
    selectedExportSource,
    sourceBaseModelName,
    exportMethod,
    isAdapter,
    quantLevels,
    effectiveImatrix,
    imatrixPath,
    effectiveNpuQ4nx,
    selectedFormats,
    hubMultiFormat,
    ggufAsLora,
    loraAsGguf,
    isMacHost,
    loraGgufOuttype,
    adapterFormat,
    exportUnsupported,
    destination,
    saveDirectory,
    hfUsername,
    modelName,
    hfToken,
    privateRepo,
    modelSource,
    runExport,
    isDecision,
    decisionIneligible,
    diffusionDisabledMethods,
    t,
  ]);

  // Open the inline panel into a fresh config state, clearing any previous terminal run.
  const handleOpenPanel = useCallback(() => {
    if (!isExporting) {
      resetExportRun();
    }
    setPanelOpen(true);
  }, [isExporting, resetExportRun]);

  // Collapse the panel. Only reachable from config / terminal states, so resetting is safe.
  const handleClosePanel = useCallback(() => {
    resetExportRun();
    setPanelOpen(false);
  }, [resetExportRun]);

  const showPanel = panelOpen || panelActive;

  // Bring the panel into view when it opens and offer a scroll-down affordance (like Chat).
  const panelEndRef = useRef<HTMLDivElement>(null);
  const [panelEndVisible, setPanelEndVisible] = useState(true);

  useEffect(() => {
    if (!showPanel) return;
    const id = window.setTimeout(() => {
      panelEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [showPanel]);

  useEffect(() => {
    const el = panelEndRef.current;
    if (!showPanel || !el) return;
    // The scroll-down button is also gated on showPanel, so the observer self-corrects on open.
    const obs = new IntersectionObserver(
      ([entry]) => setPanelEndVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [showPanel]);

  return (
    <div className="min-h-[calc(100dvh-var(--studio-titlebar-height,0px))] bg-background">
      <main className="mx-auto max-w-7xl 3xl:max-w-[calc(1440px*var(--ui-space-scale,1))] 4xl:max-w-[calc(1760px*var(--ui-space-scale,1))] px-5 py-8 max-sm:px-4 sm:px-9">
        <GuidedTour {...tour.tourProps} />

        <div className="mb-8 flex flex-col gap-0.5">
          <h1 className="text-ui-30 font-semibold leading-[1.04] tracking-[-0.028em] text-foreground sm:text-ui-34">
            {translate("studio.training.exportModel")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {translate("uxExport.exportFineTunedOr186pf")}
          </p>
        </div>

        <SectionCard
          icon={<HugeiconsIcon icon={PackageIcon} className="size-5" />}
          title={translate("uxExport.exportConfiguration1l5lg")}
          description={translate("uxExport.selectSourceMethodAnddidlg")}
          accent="emerald"
          featured={true}
          className="ring-0 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.16)] dark:shadow-none"
        >
          {/* Loading / error states */}
          {loadingCheckpoints && (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
              <Spinner className="size-4" />{translate("uxExport.loadingCheckpoints69kqt")}</div>
          )}

          {checkpointError && (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-destructive">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
              {checkpointError}
            </div>
          )}

          {!loadingCheckpoints && !checkpointError && (
            <>
              {/* Top row: Dropdowns + metadata | Guide */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      {translate("uxVideo.sourcer5qyu")}
                      <Tooltip>
                        <TooltipTrigger asChild={true}>
                          <button
                            type="button"
                            className="text-foreground/70 hover:text-foreground"
                          >
                            <HugeiconsIcon
                              icon={InformationCircleIcon}
                              className="size-3"
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {translate("uxCopy.chooseALocalModeln8k52")}
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <Tabs
                      value={sourceTab}
                      onValueChange={handleSourceTabChange}
                      className="w-full"
                    >
                      <TabsList
                        unstyled={true}
                        className="hub-menu-trigger hub-tab-toggle relative inline-flex h-9 w-full items-center rounded-full"
                      >
                        <TabsTrigger
                          value="local"
                          indicatorClassName="hub-tab-toggle-pill rounded-full"
                          className="h-9 rounded-full border-0 px-3 text-ui-12p5 text-muted-foreground hover:text-foreground data-active:text-foreground data-[state=active]:text-foreground"
                        >{translate("uxExport.localModelj4367")}</TabsTrigger>
                        <TabsTrigger
                          value="checkpoint"
                          indicatorClassName="hub-tab-toggle-pill rounded-full"
                          className="h-9 rounded-full border-0 px-3 text-ui-12p5 text-muted-foreground hover:text-foreground data-active:text-foreground data-[state=active]:text-foreground"
                        >{translate("uxExport.fineTunedgjx94")}</TabsTrigger>
                        <TabsTrigger
                          value="hf"
                          indicatorClassName="hub-tab-toggle-pill rounded-full"
                          className="h-9 rounded-full border-0 px-3 text-ui-12p5 text-muted-foreground hover:text-foreground data-active:text-foreground data-[state=active]:text-foreground"
                        >
                          Hugging Face
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {sourceMode === "checkpoint" ? (
                    <div className="flex flex-col gap-2 overflow-visible">
                      <div
                        data-tour="export-training-run"
                        className="flex flex-col gap-2"
                      >
                        <label className="text-xs font-medium text-muted-foreground">
                          {translate("uxExport.trainingRunizywt")}
                        </label>
                        <Select
                          value={selectedModelIdx ?? ""}
                          onValueChange={setSelectedModelIdx}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                models.length === 0
                                  ? translate("uxExport.noTrainingRunsFoundwuaqi")
                                  : translate("uxExport.selectATrainingRunkxvdc")
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {models.map((m) => {
                              const tsMatch = m.name.match(/_(\d{10,})$/);
                              const displayName = tsMatch
                                ? m.name.slice(0, tsMatch.index)
                                : m.name;
                              const timeStr = tsMatch
                                ? new Date(
                                    Number(tsMatch[1]) * 1000,
                                  ).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : null;
                              return (
                                <SelectItem key={m.name} value={m.name}>
                                  <span className="flex items-center gap-2">
                                    {displayName}
                                    <span className="text-muted-foreground text-xs">{translate("uxExport.checkpointl1boh", { p1: m.checkpoints.length, p2: m.checkpoints.length !== 1 ? "s" : "" })}</span>
                                    {timeStr && (
                                      <span className="text-muted-foreground text-xs">
                                        · {timeStr}
                                      </span>
                                    )}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div
                        data-tour="export-checkpoint"
                        className="flex flex-col gap-2"
                      >
                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          {translate("studio.wizard.checkpointLabel")}
                          <Tooltip>
                            <TooltipTrigger asChild={true}>
                              <button
                                type="button"
                                className="text-foreground/70 hover:text-foreground"
                              >
                                <HugeiconsIcon
                                  icon={InformationCircleIcon}
                                  className="size-3"
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Choose a saved checkpoint to export. Lower loss
                              generally means better quality.{" "}
                              <a
                                href="https://LAiM.ai/docs/basics/inference-and-deployment"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                              >{translate("uxExport.readMoreivesk")}</a>
                            </TooltipContent>
                          </Tooltip>
                        </label>
                        <Select
                          value={checkpoint ?? ""}
                          onValueChange={setCheckpoint}
                          disabled={!selectedModelIdx}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                selectedModelIdx
                                  ? checkpointsForModel.length === 0
                                    ? translate("uxExport.noCheckpointsFoundm5nzj")
                                    : translate("uxExport.selectACheckpoint2basy")
                                  : translate("uxExport.selectATrainingRun36zxh")
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {checkpointsForModel.map((cp) => (
                              <SelectItem key={cp.path} value={cp.display_name}>
                                <span className="flex items-center gap-2">
                                  {cp.display_name}
                                  {cp.loss != null && (
                                    <span className="text-muted-foreground text-xs">{translate("uxExport.lossgl3sz", { p1: cp.loss.toFixed(4) })}</span>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 overflow-visible">
                      {modelSource === "hf" ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              {translate("uxExport.huggingFaceModel15vri")}
                            </label>
                            <div ref={hfComboboxAnchorRef}>
                              <Combobox
                                items={hfResultIds}
                                filteredItems={hfResultIds}
                                filter={null}
                                value={
                                  modelInput || selectedSourceModel || null
                                }
                                onValueChange={handleHfSourceModelSelect}
                                onInputValueChange={handleHfSourceInputChange}
                                itemToStringValue={(id) => id}
                                autoHighlight={true}
                              >
                                <ComboboxInput
                                  placeholder={translate("uxExport.searchModels1jy7c")}
                                  className="w-full"
                                  onBlur={() =>
                                    applyHfSourceModel(hfModelInputRef.current)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter") return;
                                    event.preventDefault();
                                    applyHfSourceModel(hfModelInputRef.current);
                                  }}
                                >
                                  <InputGroupAddon>
                                    <HugeiconsIcon
                                      icon={Search01Icon}
                                      className="size-4"
                                    />
                                  </InputGroupAddon>
                                </ComboboxInput>
                                <ComboboxContent anchor={hfComboboxAnchorRef}>
                                  {isLoadingHfModels ? (
                                    <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                                      <Spinner className="size-4" />{translate("uxExport.searchingggxtu")}</div>
                                  ) : (
                                    <ComboboxEmpty>
                                      {translate("uxExport.noModelsFoundffon9")}
                                    </ComboboxEmpty>
                                  )}
                                  <ComboboxList>
                                    {(id: string) => (
                                      <ComboboxItem
                                        key={id}
                                        value={id}
                                        className="gap-2"
                                      >
                                        <span className="block min-w-0 flex-1 truncate">
                                          {id}
                                        </span>
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                </ComboboxContent>
                              </Combobox>
                            </div>
                            {(tokenValidationError ?? hfSearchError) && (
                              <p className="text-xs text-destructive">
                                {tokenValidationError ?? hfSearchError}
                              </p>
                            )}
                          </div>
                          {/* No persistent "trust remote code" toggle: custom code is
                              consented per model via the load-time review dialog. */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                              {translate("uxExport.huggingFaceTokenOptionalfca0r")}
                            </label>
                            <InputGroup>
                              <InputGroupAddon>
                                <HugeiconsIcon
                                  icon={Key01Icon}
                                  className="size-4"
                                />
                              </InputGroupAddon>
                              <InputGroupInput
                                type="password"
                                autoComplete="new-password"
                                name="hf-token-export-source"
                                placeholder={translate("uxRecipestudio.hfdcawb")}
                                value={hfToken}
                                onChange={(e) => setHfToken(e.target.value)}
                              />
                            </InputGroup>
                            {isCheckingToken && (
                              <p className="text-xs text-muted-foreground">{translate("uxExport.checkingTokenxk1ol")}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            {translate("uxExport.localModelPath16hrt")}
                          </label>
                          <div ref={localComboboxAnchorRef}>
                            <Combobox
                              items={localResultIds}
                              filteredItems={localFilteredIds}
                              filter={null}
                              value={localModelInput || null}
                              onValueChange={(id) => {
                                const next = id ?? "";
                                localModelInputRef.current = next;
                                setLocalModelInput(next);
                                setSelectedSourceModel(next || null);
                              }}
                              onInputValueChange={handleLocalSourceInputChange}
                              itemToStringValue={(id) => id}
                              autoHighlight={true}
                            >
                              <ComboboxInput
                                placeholder={
                                  isLoadingLocalModels
                                    ? translate("uxExport.scanningLocalAndCachedc8z7f")
                                    : "./models/my-model"
                                }
                                className="w-full"
                                onBlur={() =>
                                  applyLocalSourceModel(
                                    localModelInputRef.current,
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter") return;
                                  event.preventDefault();
                                  applyLocalSourceModel(
                                    localModelInputRef.current,
                                  );
                                }}
                              >
                                <InputGroupAddon>
                                  <HugeiconsIcon
                                    icon={FolderSearchIcon}
                                    className="size-4"
                                  />
                                </InputGroupAddon>
                              </ComboboxInput>
                              <ComboboxContent anchor={localComboboxAnchorRef}>
                                {isLoadingLocalModels ? (
                                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                                    <Spinner className="size-4" />{translate("uxExport.scanning0p1u7")}</div>
                                ) : localModelsError ? (
                                  <div className="px-3 py-2 text-xs text-red-500">
                                    {localModelsError}
                                  </div>
                                ) : (
                                  <ComboboxEmpty>
                                    {translate("uxExport.noLocalModelsFoundeq592")}
                                  </ComboboxEmpty>
                                )}
                                <ComboboxList>
                                  {(id: string) => {
                                    const model = localMetaById.get(id);
                                    const source =
                                      model?.source === "hf_cache"
                                        ? "HF cache"
                                        : model?.source === "custom"
                                          ? translate("uxExport.customFolderscu3jj")
                                          : translate("uxExport.localDir45olw");
                                    return (
                                      <ComboboxItem
                                        key={id}
                                        value={id}
                                        className="gap-2"
                                      >
                                        <span className="block min-w-0 flex-1 truncate">
                                          {model?.display_name ?? id}
                                        </span>
                                        <span className="ml-auto shrink-0 text-ui-10 text-muted-foreground">
                                          {source}
                                        </span>
                                      </ComboboxItem>
                                    );
                                  }}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          </div>
                          {isLoadingLocalModels ? (
                            <p className="text-ui-10 text-muted-foreground">
                              {translate("uxExport.scanningLocalModelsbaxuf")}
                            </p>
                          ) : localModelsError ? (
                            <p className="text-ui-10 text-red-500">
                              {localModelsError}
                            </p>
                          ) : (
                            <p className="text-ui-10 text-muted-foreground">
                              {exportableLocalModels.length > 0
                                ? `${exportableLocalModels.length} local/cached models found`
                                : translate("uxExport.noLocalModelsFoundpzxiv")}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="rounded-xl bg-[color-mix(in_oklab,var(--foreground)_calc(4%*var(--contrast-wash-gain,1)),transparent)] p-3">
                        <p className="text-ui-11 text-muted-foreground">
                          {translate("uxExport.directModelExportsCurrently66zo3")}
                        </p>
                      </div>
                    </div>
                  )}

                  {sourceMode === "checkpoint" && (
                    <div className="rounded-xl bg-[color-mix(in_oklab,var(--foreground)_calc(4%*var(--contrast-wash-gain,1)),transparent)] p-3 flex flex-col gap-2">
                      <span className="text-ui-11 font-medium text-muted-foreground uppercase tracking-wider">
                        {translate("uxExport.trainingInfo1rw5k")}
                      </span>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {translate("uxExport.baseModeleirl9")}
                          </span>
                          <span className="font-medium">{baseModelName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span className="font-medium">
                            {trainingMethodLabel}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {translate("uxExport.checkpointsl6ltv")}
                          </span>
                          <span className="font-medium">
                            {checkpointsForModel.length}
                          </span>
                        </div>
                        {isAdapter && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {translate("uxExport.loRARankza5cp")}
                            </span>
                            <span className="font-medium">{loraRank}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {translate("uxExport.quickGuide1nqlx")}
                  </span>
                  <ol className="flex flex-col gap-3">
                    {exportGuideSteps.map((step, i) => (
                      <li
                        key={step}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_calc(10%*var(--contrast-wash-gain,1)),transparent)] text-ui-10 font-semibold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {exportUnsupported && (
                <Alert variant="destructive">
                  <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
                  <AlertTitle>{translate("uxExport.exportUnavailablewnl03")}</AlertTitle>
                  <AlertDescription>
                    {exportUnsupportedMessage}
                  </AlertDescription>
                </Alert>
              )}

              <MethodPicker
                value={exportMethod}
                onChange={handleMethodChange}
                disabledMethods={
                  exportUnsupported
                    ? ["merged", "lora", "gguf"]
                    : isDecision
                      ? ["merged", "lora"]
                      : !effectiveIsAdapter && effectiveIsQuantized
                        ? ["merged", "lora", "gguf"]
                        : [
                            ...(effectiveIsAdapter ? [] : (["lora"] as const)),
                            ...diffusionDisabledMethods,
                          ]
                }
                disabledReason={
                  exportUnsupported
                    ? exportUnsupportedMessage
                    : isDecision
                      ? t("exportDecision.ggufOnly")
                      : !effectiveIsAdapter && effectiveIsQuantized
                        ? translate("uxExport.preQuantizedBNB4s8pat")
                        : [
                            effectiveIsAdapter
                              ? null
                              : "LoRA-only export needs a LoRA adapter checkpoint",
                            diffusionDisabledMethods.length > 0
                              ? diffusionLmInfo?.reason
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                }
              />

              {exportMethod === "merged" && !exportUnsupported && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Precision</div>
                      <span className="text-ui-11 text-muted-foreground/70">{translate("uxExport.selectOneOrMoreiqprk")}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableFormats
                        .filter((f) => f.common)
                        .map((f) => {
                          const active = selectedFormats.includes(f.value);
                          return (
                            <Button
                              key={f.value}
                              type="button"
                              variant={active ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleFormat(f.value)}
                              title={f.hint}
                            >
                              {f.label}
                              {f.needsCalibration ? " *" : ""}
                            </Button>
                          );
                        })}

                      {availableFormats.some((f) => !f.common) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild={true}>
                            <Button type="button" variant="outline" size="sm">
                              More formats
                              {selectedFormats.some((v) =>
                                availableFormats.find(
                                  (f) => f.value === v && !f.common,
                                ),
                              )
                                ? " ✓"
                                : "…"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64">
                            <DropdownMenuLabel>
                              {translate("uxExport.additionalFormatsgkt3v")}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {availableFormats
                              .filter((f) => !f.common)
                              .map((f) => (
                                <DropdownMenuCheckboxItem
                                  key={f.value}
                                  checked={selectedFormats.includes(f.value)}
                                  onCheckedChange={() => toggleFormat(f.value)}
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <span className="flex flex-col">
                                    <span>
                                      {f.label}
                                      {f.needsCalibration ? " *" : ""}
                                    </span>
                                    <span className="text-ui-10 text-muted-foreground">
                                      {f.hint}
                                    </span>
                                  </span>
                                </DropdownMenuCheckboxItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {selectedFormats.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-ui-11 text-muted-foreground">
                          {selectedFormats.length} selected:{" "}
                          {selectedFormats
                            .map(
                              (v) =>
                                MERGED_FORMATS.find((f) => f.value === v)
                                  ?.label ?? v,
                            )
                            .join(", ")}
                        </span>
                        {selectedFormats.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedFormats(["16-bit"])}
                            className="text-ui-11 text-muted-foreground/70 hover:text-foreground transition-colors"
                          >{translate("uxExport.resetTo16Bitofgw3")}</button>
                        )}
                      </div>
                    )}

                    {hubMultiFormat && (
                      <div className="text-ui-11 text-amber-600 dark:text-amber-500">
                        {translate("uxCopy.hubExportSupportsOne10hvj")}
                      </div>
                    )}

                    {selectedFormats.some(
                      (v) =>
                        MERGED_FORMATS.find((f) => f.value === v)
                          ?.needsCalibration,
                    ) && (
                      <div className="text-ui-11 text-muted-foreground">{translate("uxExport.calibratesOnDataUseswu9sg")}</div>
                    )}

                    {!hasNvidia && !torchaoUnavailable && (
                      <div className="text-ui-11 text-muted-foreground">
                        {translate("uxCopy.noNVIDIAGPUDetected1q637")}
                      </div>
                    )}

                    {torchaoUnavailable && (
                      <div className="text-ui-11 text-muted-foreground">
                        {translate("uxCopy.portableFP8INT8Torchao1xluz")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {exportMethod === "lora" &&
                effectiveIsAdapter &&
                !exportUnsupported && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{translate("uxExport.adapterFormatn1gkr")}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={loraAsGguf ? "outline" : "default"}
                          size="sm"
                          onClick={() => setLoraAsGguf(false)}
                          title={translate("uxExport.adapterWeightsAsSafetensors6ocb7")}
                        >{translate("uxExport.adapterSafetensorsoa3n9")}</Button>
                        <Button
                          type="button"
                          variant={loraAsGguf ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLoraAsGguf(true)}
                          disabled={diffusionDisabledMethods.includes("gguf")}
                          title={
                            diffusionDisabledMethods.includes("gguf")
                              ? (diffusionLmInfo?.reason ?? undefined)
                              : translate("uxExport.llamaCppGGUFLoRAdimxd")
                          }
                        >{translate("uxExport.gGUFAdapterwu6cm")}</Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {loraAsGguf
                          ? isMacHost
                            ? "Converts the adapter to a GGUF LoRA (llama.cpp `--lora`); the adapter files are written in PEFT format. Not available for adapters with per-module alpha values, rsLoRA with per-module ranks, DoRA, replaced embeddings or modules_to_save, or expert-parameter targets."
                            : translate("uxExport.convertsTheAdapterTopri3e")
                          : isMacHost
                            ? "Adapter weights only; pick the on-disk format below."
                            : translate("uxExport.standardPEFTAdapterFiles1ncoj")}
                      </div>
                    </div>

                    {!loraAsGguf && isMacHost && (
                      <div
                        className="space-y-2"
                        data-testid="adapter-format-picker"
                      >
                        <div className="text-sm font-medium">
                          {translate("uxExport.safetensorsFormat1ul3b")}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={
                              adapterFormat === "mlx" ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setAdapterFormat("mlx")}
                            title={translate("uxExport.nativeMlxLmAdapter18qul")}
                          >
                            MLX
                          </Button>
                          <Button
                            type="button"
                            variant={
                              adapterFormat === "peft" ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setAdapterFormat("peft")}
                            title={translate("uxExport.standardHuggingFacePEFT12xj5")}
                          >
                            PEFT
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {adapterCompatibilityTip(
                            adapterFormat,
                            selectedModelData?.adapter_features,
                          )}{" "}
                          Training checkpoints always remain MLX; this choice
                          only affects the exported copy.
                        </div>
                      </div>
                    )}

                    {loraAsGguf && (
                      <div className="space-y-1.5">
                        <div className="text-sm font-medium">{translate("uxExport.outputType2w78c")}</div>
                        <Select
                          value={loraGgufOuttype}
                          onValueChange={(v) => setLoraGgufOuttype(v)}
                        >
                          <SelectTrigger className="w-full sm:w-56">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LORA_GGUF_OUTTYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

              {exportMethod === "gguf" && !exportUnsupported && decisionInfo && (
                <div className="space-y-3">
                  {decisionIneligible ? (
                    <Alert variant="destructive">
                      <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
                      <AlertTitle>{t("exportDecision.notEligibleTitle")}</AlertTitle>
                      <AlertDescription>{decisionInfo.reason}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {t("exportDecision.title")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("exportDecision.description", {
                            layout: decisionInfo.layout === "clef" ? "Clef" : "Laya",
                          })}
                        </div>
                        {decisionInfo.adapter_only && (
                          <div className="text-xs text-muted-foreground">
                            {t("exportDecision.adapterNote")}
                          </div>
                        )}
                      </div>
                      <QuantPicker
                        value={quantLevels}
                        onChange={setQuantLevels}
                        options={decisionQuantOptions}
                      />
                      {decisionExistingQuants.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {t("exportDecision.existing", {
                            quantizations: decisionExistingQuants.join(", "),
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {exportMethod === "gguf" && !exportUnsupported && !decisionInfo && (
                <div className="space-y-3">
                  {effectiveIsAdapter && !isMacHost && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{translate("uxExport.exportTargetcvm5n")}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={
                            ggufTarget === "model" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setGgufTarget("model")}
                          title={translate("uxExport.mergeTheAdapterInto1srau")}
                        >{translate("uxExport.fullModelm6jxo")}</Button>
                        <Button
                          type="button"
                          variant={
                            ggufTarget === "lora" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setGgufTarget("lora")}
                          title={translate("uxExport.exportJustTheAdaptergearq")}
                        >{translate("uxExport.loRAAdaptert07l9")}</Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ggufTarget === "lora"
                          ? translate("uxExport.convertsTheAdapterTopri3e")
                          : translate("uxExport.mergesTheAdapterIntorqwpk")}
                      </div>
                    </div>
                  )}

                  {ggufAsLora ? (
                    <div className="space-y-1.5">
                      <div className="text-sm font-medium">{translate("uxExport.outputType2w78c")}</div>
                      <Select
                        value={loraGgufOuttype}
                        onValueChange={(v) => setLoraGgufOuttype(v)}
                      >
                        <SelectTrigger className="w-full sm:w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LORA_GGUF_OUTTYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <QuantPicker
                        value={quantLevels}
                        onChange={setQuantLevels}
                        sizes={quantSizeLabels}
                      />
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">
                            {translate("uxExport.importanceMatrixImatrix197ty")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {requiresImatrix
                              ? translate("uxExport.requiredForTheSelectedvywfl")
                              : translate("uxExport.improvesQuantQualityAnd0vubd")}
                          </div>
                        </div>
                        <Switch
                          aria-label={translate("uxExport.importanceMatrixImatrix197ty")}
                          checked={effectiveImatrix}
                          onCheckedChange={setUseImatrix}
                          disabled={requiresImatrix}
                        />
                      </div>
                      {effectiveImatrix && (
                        <div className="space-y-1.5">
                          <label
                            htmlFor="export-imatrix-path"
                            className="text-sm font-medium"
                          >
                            {translate("uxCopy.localImatrixFileOptional1oyqc")}
                          </label>
                          <InputGroup>
                            <InputGroupInput
                              id="export-imatrix-path"
                              aria-describedby="export-imatrix-path-help"
                              placeholder="/path/to/imatrix.gguf"
                              value={imatrixPath}
                              onChange={(e) =>
                                setCustomImatrix({
                                  sourceKey: imatrixSourceKey,
                                  path: e.target.value,
                                })
                              }
                            />
                          </InputGroup>
                          <p
                            id="export-imatrix-path-help"
                            className="text-xs text-muted-foreground"
                          >
                            {translate("uxCopy.absolutePathToA2jfh4")}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">
                            {translate("uxExport.alsoConvertToQ4NXdn57d")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {destination !== "local"
                              ? translate("uxExport.savesLocallyOnlyPickjomen")
                              : q4nxSourceSelected
                                ? translate("uxExport.convertsTheQ4GGUFv0j0i")
                                : translate("uxExport.needsQ40Q4kkjed")}
                          </div>
                        </div>
                        <Switch
                          aria-label={translate("uxExport.alsoConvertToQ4NXdn57d")}
                          checked={effectiveNpuQ4nx}
                          onCheckedChange={setNpuQ4nx}
                          disabled={!q4nxSourceSelected || destination !== "local"}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              {estimatedSize && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    className="size-3.5"
                  />
                  <span>{translate("uxExport.estSizeue2v1", { p1: estimatedSize })}</span>
                </div>
              )}

              <Separator />
              {showPanel && (
                <ExportRunPanel
                  exportMethod={exportMethod}
                  quantLevels={quantLevels}
                  checkpoint={selectedExportSource}
                  baseModelName={sourceBaseModelName}
                  isAdapter={sourceMode === "checkpoint" && isAdapter}
                  destination={destination}
                  onDestinationChange={setDestination}
                  saveDirectory={saveDirectory}
                  saveDirectoryInput={saveDirectoryInput}
                  defaultSaveDirectory={defaultSaveDirectory}
                  saveDirectoryOverridden={!!customSaveDirectory}
                  onSaveDirectoryChange={setCustomSaveDirectory}
                  hfUsername={hfUsername}
                  onHfUsernameChange={setHfUsername}
                  modelName={modelName}
                  onModelNameChange={setModelName}
                  hfToken={hfToken}
                  onHfTokenChange={setHfToken}
                  privateRepo={privateRepo}
                  onPrivateRepoChange={setPrivateRepo}
                  onStart={handleStart}
                  onClose={handleClosePanel}
                  decisionNote={
                    decisionInfo
                      ? t("exportDecision.outputNote", {
                          path: decisionInfo.output_dir,
                        })
                      : undefined
                  }
                />
              )}
              {showPanel && (
                <div
                  ref={panelEndRef}
                  aria-hidden="true"
                  className="h-px w-full"
                />
              )}
              {showPanel && !panelEndVisible && (
                <button
                  type="button"
                  onClick={() =>
                    panelEndRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "end",
                    })
                  }
                  aria-label={translate("uxExport.scrollToExportOutputb0cuj")}
                  className="fixed bottom-6 right-6 z-30 flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-muted"
                >
                  <HugeiconsIcon
                    icon={ChevronDownStandardIcon}
                    className="size-5"
                  />
                </button>
              )}
              {!showPanel && (
                <div className="flex items-center justify-end">
                  <Button
                    data-tour="export-cta"
                    disabled={!canExport}
                    onClick={handleOpenPanel}
                  >{translate("uxExport.exportModelz7e58")}</Button>
                </div>
              )}
            </>
          )}
        </SectionCard>
        <ImageLoraExportCard preselect={preselectImageLora} />
        <Q4nxConvertCard />
      </main>
    </div>
  );
}
