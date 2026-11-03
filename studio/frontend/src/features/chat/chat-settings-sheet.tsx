// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfoHint } from "@/components/ui/info-hint";
import { PanelResizeHandle } from "@/components/ui/panel-resize-handle";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { usePlatformStore } from "@/config/env";
import {
  NumericValueInput,
  isServedByLlamaCpp,
  presetLoadSettingNames,
  snapToStep,
} from "@/features/model-picker";
import { RetrievalSettingsSection } from "@/features/rag";
import { useLlamaUpdateCheck } from "@/hooks/use-llama-update-check";
import { useScrollFades } from "@/hooks/use-scroll-fades";
import { useSliderDraft } from "@/hooks/use-slider-draft";
import { useUiSpaceScale } from "@/hooks/use-ui-space-scale";
import {
  CHAT_SETTINGS_WIDTH_MIN,
  clampChatSettingsWidth,
  useChatSettingsWidth,
} from "@/hooks/use-chat-settings-width";
import { useIsCompact } from "@/hooks/use-mobile";
import { translate, useT } from "@/i18n";
import { ChevronDownStandardIcon } from "@/lib/chevron-icons";
import { toast } from "@/lib/toast";
import { cornerInsets, watchChatSettingsInset } from "@/lib/toast-offset";
import { cn } from "@/lib/utils";
import { Edit03Icon, PanelRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Braces, ChevronDown, ExternalLink } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { type CSSProperties, Fragment, type ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { OpenAICodeExecSection } from "./components/openai-code-exec-section";
import { PermissionModeDropdown } from "./permission-mode-select";
import { resyncInferenceStatusAfterServerModelChange } from "./hooks/use-chat-model-runtime";
import {
  type ExternalProviderConfig,
  getExternalProviderApiKey,
  parseExternalModelId,
  promptCacheTtlAppliesToModel,
  promptCachingAppliesToModel,
  providerModelSupportsStudioTools,
} from "./external-providers";
import {
  BUILTIN_PRESETS,
  BUILTIN_PRESET_NAMES,
  type Preset,
  applyPresetForProvider,
  getBuiltinVariantName,
  getOrderedPresets,
  getPresetSaveState,
  getPresetSource,
  isSamePresetConfig,
  MAX_TOKENS_MIN,
  localMaxTokensCeiling,
  toPresetParams,
} from "./presets/preset-policy";
import {
  applyPresetLoadConfig,
  capturePresetLoadConfig,
  formatPresetLoadConfigSummary,
  isSamePresetLoadConfig,
} from "./presets/preset-load-config";
import {
  type ProviderCapabilities,
  getExternalMaxOutputTokens,
  getExternalMinOutputTokens,
  modelCatalogVersion,
  providerSupportsBuiltinCodeExecution,
  providerSupportsFastMode,
  resolveExternalMaxTokensClamp,
  subscribeModelCatalog,
} from "./provider-capabilities";
import {
  isLocalModelPath,
  useChatRuntimeStore,
} from "./stores/chat-runtime-store";
import {
  MAX_SAMPLING_SEED,
  modelReadsSamplingSeed,
  type InferenceParams,
} from "./types/runtime";

import { effectiveMinPMode, isMinPMode } from "./lib/min-p-policy";
import { mlxSpecFallbackMessage } from "./lib/mlx-spec-fallback";

export { defaultInferenceParams, type Preset } from "./presets/preset-policy";
export type { InferenceParams } from "./types/runtime";

const PROMPT_VARIABLE_PATTERN = /{{\s*[a-zA-Z_$][a-zA-Z0-9_$.-]*\s*}}/;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function getPromptVariablesError(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return null;
    }
  } catch {
    return 'Use valid JSON, for example { "env": "staging" }.';
  }
  return translate("uxChat.variablesMustBeAou52u");
}

function hasPromptVariableSyntax(prompt: string): boolean {
  return PROMPT_VARIABLE_PATTERN.test(prompt);
}

export function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onDraft,
  format,
  info,
  valueSize,
  disabled,
  inline,
  commitWhileDragging = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onDraft?: (value: number | null) => void;
  format?: (value: number) => string | undefined;
  info?: ReactNode;
  valueSize?: number;
  disabled?: boolean;
  /** Label, track and value on one row, for narrow settings columns. */
  inline?: boolean;
  commitWhileDragging?: boolean;
}) {
  const commit = (v: number) => onChange(snapToStep(v, step, min, max));
  const { draft, sliderProps: draftProps } = useSliderDraft(
    value,
    commit,
    onDraft,
  );
  const sliderProps = commitWhileDragging
    ? { value: [value], onValueChange: ([v]: number[]) => commit(v) }
    : draftProps;
  const shown = draft ?? value;
  if (inline) {
    return (
      <div className="flex items-center gap-3">
        {/* A floor rather than a fixed width, so a longer label is never clipped. */}
        <div className="flex min-w-[calc(104px*var(--ui-space-scale,1))] shrink-0 items-center gap-1.5">
          <span className="text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
            {label}
          </span>
          {info && <InfoHint>{info}</InfoHint>}
        </div>
        <Slider
          min={min}
          max={max}
          step={step}
          {...sliderProps}
          className="panel-slider min-w-0 flex-1"
          disabled={disabled}
        />
        <NumericValueInput
          value={shown}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
          displayValue={format?.(shown)}
          ariaLabel={label}
          size={valueSize ?? 4}
          className="panel-number-input"
          disabled={disabled}
        />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
            {label}
          </span>
          {info && <InfoHint>{info}</InfoHint>}
        </div>
        <NumericValueInput
          value={shown}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
          displayValue={format?.(shown)}
          ariaLabel={label}
          size={valueSize ?? 4}
          className="panel-number-input"
          disabled={disabled}
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        {...sliderProps}
        className="panel-slider"
        disabled={disabled}
      />
    </div>
  );
}

const COLLAPSIBLE_STATE_KEY = "LAiM_chat_collapsible_state";

function loadCollapsibleState(): Record<string, boolean> {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(COLLAPSIBLE_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
      ),
    );
  } catch (error) {
    console.warn("Failed to load collapsible state from localStorage:", error);
    return {};
  }
}

function saveCollapsibleOpen(label: string, open: boolean) {
  if (!canUseStorage()) return;
  try {
    const state = loadCollapsibleState();
    state[label] = open;
    localStorage.setItem(COLLAPSIBLE_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function CollapsibleSection({
  label,
  labelHref,
  headerAction,
  onLabelClick,
  children,
  defaultOpen = false,
  first = false,
}: {
  label: string;
  /** When set, the label becomes an external link instead of part of the toggle. The chevron
   *  still toggles, so link and button are siblings rather than an <a> inside a <button>. */
  labelHref?: string;
  /** Optional control rendered before the chevron. The label and chevron become sibling toggles
   *  so the action is not a button nested in a button. */
  headerAction?: ReactNode;
  /** When set, clicking the label runs this instead of toggling collapse. */
  onLabelClick?: () => void;
  children?: ReactNode;
  defaultOpen?: boolean;
  first?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    const saved = loadCollapsibleState();
    return Object.hasOwn(saved, label) ? saved[label] : defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    saveCollapsibleOpen(label, next);
  };

  const headerClasses = cn(
    "flex w-full items-center justify-between text-ui-12 font-medium normal-case tracking-[0.04em] text-nav-fg-muted transition-colors focus-visible:outline-none focus-visible:ring-0",
    first ? "pt-4 pb-5" : "py-5",
  );

  return (
    <div
      className={cn(
        !first && "border-t border-[rgb(6_29_33_/_calc(0.13*var(--contrast-edge-gain,1)))] dark:border-[rgb(249_226_222_/_calc(0.09*var(--contrast-edge-gain,1)))]",
      )}
    >
      {labelHref ? (
        <div className={headerClasses}>
          <a
            href={labelHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1 leading-none transition-colors hover:text-nav-fg"
          >
            <span>{label}</span>
            <ExternalLink className="size-3" />
          </a>
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? translate("uxChat.collapseic5r8", { p1: label }) : translate("uxChat.expandthl3p", { p1: label })}
            className="flex shrink-0 cursor-pointer items-center leading-none transition-colors hover:text-nav-fg"
          >
            <ChevronDown
              className={cn("size-3.5", open ? "rotate-0" : "-rotate-90")}
            />
          </button>
        </div>
      ) : headerAction ? (
        <div className={headerClasses}>
          <button
            type="button"
            onClick={onLabelClick ?? toggle}
            className="flex min-w-0 flex-1 cursor-pointer items-center text-left leading-none transition-colors hover:text-nav-fg"
          >
            <span className="leading-none">{label}</span>
          </button>
          <span className="flex shrink-0 items-center gap-1">
            {headerAction}
            <button
              type="button"
              onClick={toggle}
              aria-label={open ? translate("uxChat.collapseic5r8", { p1: label }) : translate("uxChat.expandthl3p", { p1: label })}
              className="flex shrink-0 cursor-pointer items-center leading-none transition-colors hover:text-nav-fg"
            >
              <ChevronDown
                className={cn("size-3.5", open ? "rotate-0" : "-rotate-90")}
              />
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggle}
          className={cn("cursor-pointer hover:text-nav-fg", headerClasses)}
        >
          <span className="leading-none">{label}</span>
          <span className="flex shrink-0 items-center leading-none">
            <ChevronDown
              className={cn("size-3.5", open ? "rotate-0" : "-rotate-90")}
            />
          </span>
        </button>
      )}
      {/* Same gap below the last control as the header leaves above the first. */}
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

interface ChatSettingsPanelProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  modelConfig?: ReactNode;
  isExternalModel?: boolean;
  /** Sampling-param capabilities for the active external provider, or `null` for local models
   *  (every knob rendered). Drives per-param sampling visibility. */
  providerCapabilities?: ProviderCapabilities | null;
  activeExternalProvider?: ExternalProviderConfig | null;
  onExternalProviderChange?: (provider: ExternalProviderConfig) => void;
  /** Backend provider type for the active external model, or `null` for local models. Drives the
   *  per-provider Max Tokens floor in the slider. */
  externalProviderType?: string | null;
}

/** Copy for the amber "running without speculative decoding" notice. Mirrors
 *  InferenceStatusResponse.spec_fallback_reason. Out of the JSX so the three dimensions
 *  read as a table rather than a five-level nested ternary, and so each string is testable. */
function specFallbackMessage({
  reason,
  drafter,
  isLocalGguf,
  updateAvailable,
}: {
  reason: string;
  drafter: "MTP" | "DSpark" | "DFlash" | "ngram-mod";
  isLocalGguf: boolean;
  updateAvailable: boolean;
}): string {
  switch (reason) {
    case "mla_mtp_disabled":
      return translate("uxChat.mTPIsDisabledBy7bzyu");
    case "mtp_partial_offload":
      // Not the default copy: this build does support MTP, so telling the user to update llama.cpp
      // would name the wrong cause. Says what the placement IS rather than that the model could
      // not fit, since a Manual layer count is a placement the user picked and more layers is the
      // useful remedy. Describes the placement MTP WOULD need, not the one that runs: the partial
      // verdict is priced with MTP's rollback reserve still in it.
      return translate("uxChat.withMTPOnPartmsx0n");
    case "drafter_no_vram":
      // Not "without speculative decoding": the backend puts zero-VRAM ngram-mod in the drafter's
      // place where the build has it, so only the drafter is off.
      return translate("uxChat.thisModelFitsInubleo", { p1: drafter, p2: drafter, p3: drafter });
    case "runtime_error":
      return `${drafter} could not start for this model on the installed llama.cpp build, so it is running without speculative decoding.`;
    case "drafter_unloadable":
      // The file IS beside the model; it just cannot be opened as a draft. So no "place
      // the sidecar" and no "check your network": both name a remedy that changes
      // nothing, and the backend stands the refetch down for exactly this case.
      return "This model's MTP drafter file cannot be loaded as a draft model, so it is running without MTP. The sidecar beside the model is a head-only file that llama.cpp cannot open on its own. Replace it with a self-contained mtp-*.gguf, then reload the model.";
    case "drafter_not_found":
      if (drafter === "DSpark") {
        return isLocalGguf
          ? "No matching DSpark sidecar was found. Place its dspark-*.gguf beside the model or in its dspark folder, then reload the model."
          : translate("uxChat.theDSparkSidecarCould82yz3");
      }
      if (drafter === "DFlash") {
        return isLocalGguf
          ? "No matching DFlash sidecar was found. Place its dflash-*.gguf beside the model, then reload the model."
          : translate("uxChat.theDFlashSidecarCouldtwmsm");
      }
      return isLocalGguf
        ? "This local model supports MTP, but no matching drafter file was found. Place its mtp-*.gguf beside the model or in its MTP folder, then reload the model."
        : translate("uxChat.thisModelSupportsMTPiv13q");
    default:
      return `${drafter} is not available in the installed llama.cpp build, so this model is running without it.${
        updateAvailable ? translate("uxChat.updateLlamaCppTotbgcn") : ""
      }`;
  }
}

export function ChatSettingsPanel({
  open,
  onOpenChange,
  modelConfig = null,
  isExternalModel = false,
  providerCapabilities = null,
  activeExternalProvider = null,
  onExternalProviderChange,
  externalProviderType = null,
}: ChatSettingsPanelProps) {
  const asideRef = useRef<HTMLElement>(null);
  const t = useT();
  const params = useChatRuntimeStore((s) => s.params);
  const setParams = useChatRuntimeStore((s) => s.setParams);
  const {
    width: settingsWidth,
    max: settingsMax,
    scale: settingsScale,
    stored: settingsStored,
    setWidth: setSettingsWidth,
    resetWidth: resetSettingsWidth,
  } = useChatSettingsWidth();
  // Local models show every knob; providerCapabilities is only consulted when isExternalModel.
  // Unknown providers fall back to the OpenAI-compat shape, so these flags never undercount.
  const showTemperature =
    !isExternalModel || Boolean(providerCapabilities?.temperature);
  const showTopP = !isExternalModel || Boolean(providerCapabilities?.topP);
  const showTopK = !isExternalModel || Boolean(providerCapabilities?.topK);
  const isVllm = isExternalModel && externalProviderType === "vllm";
  const showMinP = !isExternalModel || Boolean(providerCapabilities?.minP);
  const showRepetitionPenalty =
    !isExternalModel || Boolean(providerCapabilities?.repetitionPenalty);
  const showPresencePenalty =
    !isExternalModel || Boolean(providerCapabilities?.presencePenalty);
  // Overlay as a sheet below lg so the thread keeps its width.
  const isCompact = useIsCompact();
  const uiSpaceScale = useUiSpaceScale();
  const activeGgufVariant = useChatRuntimeStore((s) => s.activeGgufVariant);
  const loadedIsGguf = useChatRuntimeStore((s) => s.loadedIsGguf);
  const activeNativePathToken = useChatRuntimeStore(
    (s) => s.activeNativePathToken,
  );
  useEffect(() => {
    if (!open || isCompact) return;
    return watchChatSettingsInset(
      cornerInsets,
      asideRef.current,
      settingsWidth * settingsScale,
      uiSpaceScale,
    );
  }, [open, isCompact, settingsWidth, settingsScale, uiSpaceScale]);
  const currentCheckpoint = params.checkpoint;
  const activeModelIsLocal = useChatRuntimeStore(
    (s) => s.activeModelIsLocal,
  );
  const loadedContextLength = useChatRuntimeStore((s) => s.loadedContextLength);
  const isGguf = isServedByLlamaCpp({
    loadedIsGguf,
    activeGgufVariant,
    activeNativePathToken,
    checkpoint: currentCheckpoint,
  });
  const activeModel = useChatRuntimeStore(
    (s) => s.models.find((m) => m.id === currentCheckpoint) ?? null,
  );
  // Same call the request body makes, on the same summary, so the panel cannot offer a seed the
  // body drops. An external selection carries an `external::` id no local entry matches, so
  // the summary answers that case without a separate guard.
  const showSeed = modelReadsSamplingSeed(activeModel);
  const platformDeviceType = usePlatformStore((s) => s.deviceType);
  // Unified memory, not just Darwin: an Intel Mac spills to system RAM like a PC.
  const isUnifiedMemory = usePlatformStore((s) => s.appleSilicon);
  const platformChatOnlyReason = usePlatformStore((s) => s.chatOnlyReason);
  const loadSettingNames = presetLoadSettingNames(
    isGguf,
    platformDeviceType,
    platformChatOnlyReason,
  );
  // activeModelIsLocal is the backend's own classification and covers native picks. Two things
  // must not decide it: activeNativePathToken, which status reconciliation keeps across a
  // switch to a remote GGUF, and a bare .gguf suffix, since the backend reads a one-slash
  // org/name.gguf as a repository id, not a file.
  const isLocalGguf =
    isGguf && (activeModelIsLocal || isLocalModelPath(currentCheckpoint ?? ""));
  const maxContextLength = useChatRuntimeStore(
    (s) => s.maxContextLength,
  );
  const customContextLength = useChatRuntimeStore((s) => s.customContextLength);
  const kvCacheDtype = useChatRuntimeStore((s) => s.kvCacheDtype);
  const mlxKvQuant = useChatRuntimeStore((s) => s.mlxKvQuant);
  const gpuMemoryMode = useChatRuntimeStore((s) => s.gpuMemoryMode);
  const gpuLayers = useChatRuntimeStore((s) => s.gpuLayers);
  const nCpuMoe = useChatRuntimeStore((s) => s.nCpuMoe);
  const tensorParallel = useChatRuntimeStore((s) => s.tensorParallel);
  const disableVision = useChatRuntimeStore((s) => s.disableVision);
  const specDraftNMax = useChatRuntimeStore((s) => s.specDraftNMax);
  const nParallel = useChatRuntimeStore((s) => s.nParallel);
  // subscribe to the same requested values that preset capture snapshots.
  const reasoningBudget = useChatRuntimeStore((s) =>
    s.reasoningBudget === s.loadedReasoningBudget
      ? (s.loadedReasoningBudgetRequested ?? s.reasoningBudget)
      : s.reasoningBudget,
  );
  const reasoningBudgetMessage = useChatRuntimeStore(
    (s) =>
      s.reasoningBudgetMessage === s.loadedReasoningBudgetMessage
        ? (s.loadedReasoningBudgetMessageRequested ?? s.reasoningBudgetMessage)
        : s.reasoningBudgetMessage,
  );
  const nBatch = useChatRuntimeStore((s) => s.nBatch);
  const nUbatch = useChatRuntimeStore((s) => s.nUbatch);
  const speculativeType = useChatRuntimeStore((s) => s.speculativeType);
  const specFallbackReason = useChatRuntimeStore((s) => s.specFallbackReason);
  const specDrafterKind = useChatRuntimeStore((s) => s.specDrafterKind);
  const loadedSpeculativeType = useChatRuntimeStore(
    (s) => s.loadedSpeculativeType,
  );
  // The loaded model's own kind, not the pending control: the notice explains a
  // fallback that already happened, so a staged edit (or a preset applied without
  // a reload) must not re-label it and point at the wrong file.
  const speculativeDrafterLabel: "MTP" | "DSpark" | "DFlash" | "ngram-mod" =
    // The LOADED mode, per the comment above. Before the drafter kind, not after:
    // ngram-mod opens none, so spec_drafter_kind still holds the MTP resolution's.
    loadedSpeculativeType === "ngram"
      ? "ngram-mod"
      : (specDrafterKind ?? speculativeType) === "dspark"
        ? "DSpark"
        : (specDrafterKind ?? speculativeType) === "dflash"
          ? "DFlash"
          : "MTP";
  const mtpUpdatable =
    specFallbackReason === "binary_no_mtp" ||
    specFallbackReason === "binary_outdated";
  const {
    status: llamaUpdateStatus,
    applying: llamaUpdating,
    apply: applyLlamaUpdate,
  } = useLlamaUpdateCheck({
    enabled: mtpUpdatable,
    onReloadRequired: resyncInferenceStatusAfterServerModelChange,
  });
  const handleMtpUpdate = useCallback(async () => {
    const result = await applyLlamaUpdate();
    if (result.ok) {
      const reloadHint = result.reloadRequired
        ? translate("uxChat.reloadModelForDrafterY36hp", {
            p1: speculativeDrafterLabel,
          })
        : "";
      toast.success(
        translate("uxChat.llamaUpdatedToS62nq", {
          p1: result.tag ?? translate("uxChat.theLatestBuildK81vy"),
          p2: reloadHint,
        }),
      );
    } else {
      toast.error(
        translate("uxChat.updateFailedN48ks", {
          p1: result.error ?? translate("uxChat.unknownErrorV73mb"),
        }),
      );
    }
  }, [applyLlamaUpdate, speculativeDrafterLabel]);
  const loadedEffectiveContext = customContextLength ?? loadedContextLength;
  const showSpecFallback =
    !isExternalModel &&
    isGguf &&
    specFallbackReason != null &&
    (speculativeType === "auto" ||
      speculativeType === "mtp" ||
      speculativeType === "mtp+ngram" ||
      speculativeType === "dspark" ||
      speculativeType === "dflash" ||
      // ngram-mod runs no drafter, so only the binary stand-down reaches it. Without
      // this the panel shows ngram selected, no speculation running, and no reason.
      speculativeType === "ngram");
  const loadedIsMlx = useChatRuntimeStore((s) => s.loadedIsMlx);
  const mlxSpecFallback =
    !isExternalModel && loadedIsMlx && specFallbackReason != null
      ? mlxSpecFallbackMessage(specFallbackReason, specDrafterKind)
      : null;
  const showContextVramWarning =
    !isExternalModel &&
    isGguf &&
    maxContextLength != null &&
    loadedEffectiveContext != null &&
    loadedEffectiveContext > maxContextLength;
  const showLoadedDiagnostics =
    showSpecFallback || mlxSpecFallback != null || showContextVramWarning;
  const hasModelContent = showLoadedDiagnostics;
  const setActivePresetSource = useChatRuntimeStore(
    (s) => s.setActivePresetSource,
  );
  const activePresetSource = useChatRuntimeStore((s) => s.activePresetSource);
  const customPresets = useChatRuntimeStore((s) => s.customPresets);
  const setCustomPresets = useChatRuntimeStore((s) => s.setCustomPresets);
  const activePreset = useChatRuntimeStore((s) => s.activePreset);
  const setActivePreset = useChatRuntimeStore((s) => s.setActivePreset);
  const settingsHydrated = useChatRuntimeStore((s) => s.settingsHydrated);

  const baseContext = loadedContextLength;
  const [presetNameInput, setPresetNameInput] = useState(activePreset);
  const [systemPromptEditorOpen, setSystemPromptEditorOpen] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [systemVariablesDraft, setSystemVariablesDraft] = useState("");
  const [systemVariablesOpen, setSystemVariablesOpen] = useState(false);
  // Raw keystrokes while the Seed box is being typed into, null once committed. Clamping
  // straight into params would rewrite the box mid-entry, so the commit waits for blur.
  const [seedDraft, setSeedDraft] = useState<string | null>(null);
  // What blur would commit, available before it runs. Clicking Save blurs the box during
  // mousedown, but React has not re-rendered by the time onClick fires, so a handler reading
  // `params` still sees the seed from before the entry. NumericValueInput bridges the same gap
  // with its imperative commit().
  const committedSeed = useMemo<number | null>(() => {
    if (seedDraft === null) return params.seed ?? null;
    // Measured after the padding: a zero-padded seed is short enough to keep, and truncating
    // instead of clamping would rewrite it.
    const digits = seedDraft.replace(/^0+(?=\d)/, "");
    if (digits === "") return null;
    return digits.length > 10
      ? MAX_SAMPLING_SEED
      : Math.min(Number(digits), MAX_SAMPLING_SEED);
  }, [params.seed, seedDraft]);
  const paramsWithCommittedSeed = useMemo(
    () =>
      committedSeed === (params.seed ?? null)
        ? params
        : { ...params, seed: committedSeed },
    [committedSeed, params],
  );
  // Removing a focused element fires no blur, so a draft the user walked away from would keep
  // reporting through committedSeed with the field gone.
  useEffect(() => {
    setSeedDraft(null);
  }, [currentCheckpoint, showSeed]);
  // When the prompt overflows the inline box, clicking opens the popup editor.
  const systemPromptBoxRef = useRef<HTMLTextAreaElement>(null);
  const [systemPromptOverflows, setSystemPromptOverflows] = useState(false);
  const promptObserverRef = useRef<ResizeObserver | null>(null);
  const measurePromptRef = useRef<() => void>(() => {});
  // The section unmounts its textarea when collapsed, so observe through a callback ref: a
  // stored observer would cling to the detached node and the remounted one is never measured.
  const attachPromptBox = useCallback((node: HTMLTextAreaElement | null) => {
    systemPromptBoxRef.current = node;
    promptObserverRef.current?.disconnect();
    promptObserverRef.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;
    // Resizing rewraps the prompt, and a drag changes the width through a custom property
    // without re-rendering, so watch the box itself.
    const observer = new ResizeObserver(() => measurePromptRef.current());
    observer.observe(node);
    promptObserverRef.current = observer;
    measurePromptRef.current();
  }, []);
  const [activePresetBaseline, setActivePresetBaseline] = useState(params);
  const presets = useMemo(() => {
    return getOrderedPresets(customPresets);
  }, [customPresets]);
  const activePresetDefinition = useMemo(
    () => presets.find((preset) => preset.name === activePreset) ?? null,
    [activePreset, presets],
  );
  const activeCustomPreset = useMemo(
    () => customPresets.find((preset) => preset.name === activePreset) ?? null,
    [activePreset, customPresets],
  );
  const activeBuiltinPreset = useMemo(
    () =>
      BUILTIN_PRESETS.find((preset) => preset.name === activePreset) ?? null,
    [activePreset],
  );
  const hasUnsavedPresetChanges = useMemo(() => {
      if (activePresetDefinition == null) {
        return false;
      }
      const samplingChanged =
        activePresetDefinition.name === "Default"
          ? activePresetSource === "modified" ||
            committedSeed !== (params.seed ?? null)
          : !isSamePresetConfig(
              activePresetDefinition.params,
              paramsWithCommittedSeed,
            );
      const currentLoadConfig = capturePresetLoadConfig();
      const loadChanged = !isSamePresetLoadConfig(
        activePresetDefinition.loadConfig,
        currentLoadConfig,
      );
      return samplingChanged || loadChanged;
  }, [
    activePresetDefinition,
    activePresetSource,
    params,
    committedSeed,
    paramsWithCommittedSeed,
    customContextLength,
    loadedContextLength,
    kvCacheDtype,
    mlxKvQuant,
    gpuMemoryMode,
    gpuLayers,
    nCpuMoe,
    tensorParallel,
    disableVision,
    speculativeType,
    specDraftNMax,
    nParallel,
    reasoningBudget,
    reasoningBudgetMessage,
    nBatch,
    nUbatch,
    params.maxSeqLength,
  ]);
  const activePresetLoadSummary = useMemo(
    () => formatPresetLoadConfigSummary(activePresetDefinition?.loadConfig),
    [activePresetDefinition],
  );
  const currentLoadSummary = useMemo(
    () => formatPresetLoadConfigSummary(capturePresetLoadConfig()),
    [
      customContextLength,
      loadedContextLength,
      kvCacheDtype,
      mlxKvQuant,
      gpuMemoryMode,
      gpuLayers,
      nCpuMoe,
      tensorParallel,
      disableVision,
      speculativeType,
      specDraftNMax,
      nParallel,
      reasoningBudget,
      reasoningBudgetMessage,
      nBatch,
      nUbatch,
      params.maxSeqLength,
    ],
  );
  const presetSaveState = useMemo(
    () =>
      getPresetSaveState({
        rawName: presetNameInput,
        activePreset,
        presets,
        hasUnsavedPresetChanges,
      }),
    [activePreset, hasUnsavedPresetChanges, presetNameInput, presets],
  );
  const systemVariablesError = getPromptVariablesError(systemVariablesDraft);
  const currentSystemPrompt = params.systemPrompt ?? "";
  const currentSystemVariables = params.systemVariables ?? "";
  const systemPromptEditorDirty =
    systemPromptDraft !== currentSystemPrompt ||
    systemVariablesDraft !== currentSystemVariables;
  const externalSelection = currentCheckpoint
    ? parseExternalModelId(currentCheckpoint)
    : null;
  // Budget, duration and dedupe are knobs of LAiM's own tool loop, which external turns run
  // only when the provider supports LAiM tools (`=== true`, the same test the request uses).
  const showStudioToolLoopControls =
    !isExternalModel ||
    providerModelSupportsStudioTools(
      externalProviderType,
      externalSelection?.modelId,
    ) === true;

  const showPromptCacheTtlControl = Boolean(
    activeExternalProvider &&
      promptCacheTtlAppliesToModel(
        activeExternalProvider.providerType,
        externalSelection?.modelId,
      ),
  );
  const showPromptCachingControl =
    activeExternalProvider != null &&
    promptCachingAppliesToModel(
      activeExternalProvider.providerType,
      externalSelection?.modelId,
    );
  const promptCachingEnabled =
    activeExternalProvider?.enablePromptCaching !== false;
  // The OpenRouter cap comes from the live catalog, which can land after this panel renders.
  useSyncExternalStore(subscribeModelCatalog, modelCatalogVersion);
  const maxTokensMax = isExternalModel
    ? getExternalMaxOutputTokens(
        externalProviderType,
        externalSelection?.modelId,
        activeExternalProvider?.maxOutputTokens,
      )
    : localMaxTokensCeiling(baseContext, params.maxSeqLength);
  const showOpenAICodeExecSection =
    activeExternalProvider != null &&
    providerSupportsBuiltinCodeExecution(
      activeExternalProvider.providerType,
      externalSelection?.modelId,
      activeExternalProvider.baseUrl,
    ) &&
    activeExternalProvider.providerType === "openai";
  const showFastModeControl =
    activeExternalProvider != null &&
    providerSupportsFastMode(
      activeExternalProvider.providerType,
      externalSelection?.modelId,
    );
  const activeThreadId = useChatRuntimeStore((s) => s.activeThreadId);
  const openAiApiKeyForSection =
    activeExternalProvider && !activeExternalProvider.hasApiKey
      ? getExternalProviderApiKey(activeExternalProvider.id) || null
      : null;

  function set<K extends keyof InferenceParams>(key: K) {
    return (v: InferenceParams[K]) => {
      const nextParams = {
        ...useChatRuntimeStore.getState().params,
        [key]: v,
        ...(key === "minP" ? { minPMode: "custom" as const } : {}),
      };
      const nextSource = isSamePresetConfig(activePresetBaseline, nextParams)
        ? getPresetSource(activePreset)
        : "modified";
      setActivePresetSource(nextSource);
      setParams(nextParams, {
        minPChoiceEdited: key === "minP" || key === "minPMode",
      });
    };
  }

  const setSeed = set("seed");

  // Lower a live Max Tokens that no longer fits the connection's cap.
  // `resolveExternalMaxTokensClamp` documents why an unresolved provider must not be read as
  // the 32,768 fallback.
  useEffect(() => {
    const clampedMaxTokens = resolveExternalMaxTokensClamp({
      settingsHydrated,
      hasActiveExternalProvider: activeExternalProvider != null,
      isExternalModel,
      maxTokens: params.maxTokens,
      maxTokensMax,
    });
    if (clampedMaxTokens == null) {
      return;
    }
    const nextParams = { ...params, maxTokens: clampedMaxTokens };
    const nextSource = isSamePresetConfig(activePresetBaseline, nextParams)
      ? getPresetSource(activePreset)
      : "modified";
    setActivePresetSource(nextSource);
    setParams(nextParams);
  }, [
    activeExternalProvider,
    activePreset,
    activePresetBaseline,
    isExternalModel,
    maxTokensMax,
    setParams,
    params,
    settingsHydrated,
    setActivePresetSource,
  ]);

  function applyPresetParamsWithinCurrentLimits(
    preset: Preset,
  ): InferenceParams {
    const nextParams = applyPresetForProvider(params, preset, isVllm ? "vllm" : null);
    // Same reason the effect waits for a provider: without one `maxTokensMax` is the fallback, so
    // applying a preset here would lower the value for good.
    if (!isExternalModel || activeExternalProvider == null) return nextParams;
    return {
      ...nextParams,
      maxTokens: Math.min(nextParams.maxTokens, maxTokensMax),
    };
  }

  function applyPreset(name: string) {
    if (!settingsHydrated) {
      return;
    }
    const p = presets.find((pr) => pr.name === name);
    if (p) {
      setParams(applyPresetParamsWithinCurrentLimits(p), {
        minPChoiceEdited: true,
      });
      if (p.loadConfig) {
        applyPresetLoadConfig(p.loadConfig);
      }
      setActivePreset(name);
      setActivePresetSource(getPresetSource(name));
      if (p.loadConfig && params.checkpoint) {
        toast.info(translate("uxChat.reloadTheModelTo1iaf2"));
      }
    }
  }

  function savePresetWithName(rawName: string) {
    if (!settingsHydrated) {
      return;
    }
    const trimmed = rawName.trim();
    if (!trimmed) {
      toast.error(translate("uxChat.enterAPresetName5ddgj"));
      return;
    }
    const usedNames = new Set([
      ...BUILTIN_PRESET_NAMES,
      ...customPresets.map((preset) => preset.name),
    ]);
    const saveName = BUILTIN_PRESET_NAMES.has(trimmed)
      ? getBuiltinVariantName(trimmed, usedNames)
      : trimmed;
    const next = customPresets.filter((p) => p.name !== saveName);
    const loadConfig = capturePresetLoadConfig();
    const merged = [
      ...next,
      {
        name: saveName,
        params: toPresetParams(paramsWithCommittedSeed),
        ...(loadConfig ? { loadConfig } : {}),
      },
    ];
    setCustomPresets(merged);
    setActivePreset(saveName);
    setActivePresetSource("custom");
    setPresetNameInput(saveName);
  }

  function deletePreset(name: string) {
    if (!settingsHydrated) {
      return;
    }
    const hasCustomPreset = customPresets.some(
      (preset) => preset.name === name,
    );
    if (!hasCustomPreset) {
      return;
    }
    const fallbackPreset =
      BUILTIN_PRESETS.find((preset) => preset.name === "Default") ?? null;
    const next = customPresets.filter((preset) => preset.name !== name);
    setCustomPresets(next);
    if (activePreset === name) {
      if (fallbackPreset) {
        setParams(
          applyPresetParamsWithinCurrentLimits(fallbackPreset),
          { minPChoiceEdited: true },
        );
        if (fallbackPreset.loadConfig) {
          applyPresetLoadConfig(fallbackPreset.loadConfig);
        }
        setActivePreset(fallbackPreset.name);
        setActivePresetSource("builtin-default");
      }
    }
  }

  function openSystemPromptEditor() {
    setSystemPromptDraft(currentSystemPrompt);
    setSystemVariablesDraft(currentSystemVariables);
    setSystemVariablesOpen(
      currentSystemVariables.trim().length > 0 ||
        hasPromptVariableSyntax(currentSystemPrompt),
    );
    setSystemPromptEditorOpen(true);
  }

  function saveSystemPromptEditor() {
    if (systemVariablesError) {
      toast.error(translate("uxChat.fixPromptVariablesBefore2xpvg"), {
        description: systemVariablesError,
      });
      return;
    }
    const nextParams = {
      ...params,
      systemPrompt: systemPromptDraft,
      systemVariables: systemVariablesDraft.trim(),
    };
    const nextSource = isSamePresetConfig(activePresetBaseline, nextParams)
      ? getPresetSource(activePreset)
      : "modified";
    setActivePresetSource(nextSource);
    setParams(nextParams);
    setSystemPromptEditorOpen(false);
  }

  useEffect(() => {
    if (activePresetSource !== "modified") {
      setActivePresetBaseline(params);
    }
  }, [activePresetSource, params]);

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }
    if (presets.some((preset) => preset.name === activePreset)) {
      const expectedSource = getPresetSource(activePreset);
      if (
        activePresetSource !== "modified" &&
        activePresetSource !== expectedSource
      ) {
        setActivePresetSource(expectedSource);
      }
      return;
    }
    setActivePreset("Default");
    setActivePresetSource("builtin-default");
  }, [
    activePreset,
    activePresetSource,
    presets,
    setActivePreset,
    setActivePresetSource,
    settingsHydrated,
  ]);

  useEffect(() => {
    setPresetNameInput(activePreset);
  }, [activePreset]);

  useEffect(() => {
    if (!open) {
      setSystemPromptEditorOpen(false);
    }
  }, [open]);

  useEffect(() => {
    measurePromptRef.current = () => {
      const el = systemPromptBoxRef.current;
      setSystemPromptOverflows(
        currentSystemPrompt.length > 0 &&
          el != null &&
          el.clientHeight > 0 &&
          el.scrollHeight > el.clientHeight + 1,
      );
    };
    measurePromptRef.current();
  }, [currentSystemPrompt, open]);

  useEffect(() => () => promptObserverRef.current?.disconnect(), []);

  // Settings dissolve at whichever edge they run past, as on Images and Video.
  const {
    attach: attachSettingsScroll,
    onScroll: onSettingsScroll,
    className: settingsFadeClass,
  } = useScrollFades();

  const settingsContent = (
    <>
      <div className="hint-on-hover flex h-full min-h-0 flex-col">
      {/* Header is outside the scroll area so the scrollbar never shifts the close button.
          Reuse the chat header metrics so the toggle stays put when the panel opens. */}
      <div className="flex h-[var(--studio-chat-header-height,48px)] shrink-0 items-start gap-2 bg-panel-surface pl-[calc(18px*var(--ui-space-scale,1))] pr-[calc(18px*var(--ui-space-scale,1))] pt-[var(--studio-chat-header-padding-top,11px)]">
        {isCompact ? (
          <span className="flex h-[var(--studio-chat-control-height,34px)] flex-1 items-center text-ui-16 font-semibold tracking-[0em] dark:tracking-[0.015em] text-nav-fg">
            {translate("uxModelpicker.runSettingsmw4kg")}
          </span>
        ) : (
          <>
            <span className="flex h-[var(--studio-chat-control-height,34px)] flex-1 items-center text-ui-16 font-semibold tracking-[0em] dark:tracking-[0.015em] text-nav-fg">
              {translate("uxModelpicker.runSettingsmw4kg")}
            </span>
            <Tooltip key={open ? "open" : "closed"}>
                <TooltipPrimitive.Trigger asChild={true}>
                {/* Centred in the control row, as the header's open button is, so the toggle doesn't jump. */}
                <button
                  type="button"
                  onClick={() => onOpenChange?.(false)}
                  className="mt-[calc((var(--studio-chat-control-height,33px)-30px*var(--ui-space-scale,1))/2)] flex size-[calc(30px*var(--ui-space-scale,1))] cursor-pointer items-center justify-center rounded-[10px] text-nav-icon-idle dark:text-nav-fg-muted transition-colors hover:bg-nav-surface-hover hover:text-[#061d21] dark:hover:text-[#f9e2de] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={translate("uxChat.closeRunSettings15lyc")}
                >
                  <HugeiconsIcon
                    icon={PanelRightIcon}
                    strokeWidth={1.75}
                    className="size-icon"
                  />
                </button>
              </TooltipPrimitive.Trigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="tooltip-compact"
              >
                {translate("uxChat.closeRunSettings15lyc")}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      <div
        ref={attachSettingsScroll}
        onScroll={onSettingsScroll}
        className={cn(
          "run-settings-scroll panel-scroll-fade relative min-h-0 flex-1 overflow-y-auto",
          settingsFadeClass,
        )}
      >
      <div className="px-[calc(18px*var(--ui-space-scale,1))] pt-3">
        {(hasModelContent || modelConfig) && (
              <CollapsibleSection label={translate("settings.voice.dictation.customModelLabel")} defaultOpen={true} first={true}>
            <div className="flex flex-col gap-5">
              {modelConfig}
              {showSpecFallback && (
                <div className="rounded-lg bg-amber-500/[0.08] px-3 py-2 text-ui-12 leading-[1.4] text-nav-fg/80">
                  <p>
                    {specFallbackMessage({
                      reason: specFallbackReason,
                      drafter: speculativeDrafterLabel,
                      isLocalGguf,
                      updateAvailable: Boolean(llamaUpdateStatus?.llama.update_available),
                    })}
                  </p>
                  {mtpUpdatable && llamaUpdateStatus?.llama.update_available && (
                    <Button
                      size="sm"
                      className="corner-squircle mt-2 h-7 text-ui-12"
                      onClick={handleMtpUpdate}
                      disabled={llamaUpdating}
                      data-test-id="mtp-update-button"
                    >
                      {llamaUpdating ? "Updating..." : translate("uxChat.updateLlamaCppyyoyi")}
                    </Button>
                  )}
                </div>
              )}
              {mlxSpecFallback && (
                <div className="rounded-lg bg-amber-500/[0.08] px-3 py-2 text-ui-12 leading-[1.4] text-nav-fg/80">
                  <p>{mlxSpecFallback}</p>
                </div>
              )}
              {showContextVramWarning && (
                <p className="text-ui-11 text-amber-500">
                  {isUnifiedMemory ? (
                    <>{translate("uxChat.contextLengthIsAboveav2dk", { p1: maxContextLength?.toLocaleString() })}</>
                  ) : (
                    <>{translate("uxChat.contextLengthExceedsTheu26qn", { p1: maxContextLength?.toLocaleString() })}</>
                  )}
                </p>
              )}
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection
          label={translate("uxChat.preset1jsxh")}
          headerAction={
            <InfoHint>
              Saving a preset also stores current load settings (
              {loadSettingNames}).
              {currentLoadSummary ? (
                <>{translate("uxChat.activeNowwqpi8", { p1: " ", p2: currentLoadSummary })}</>
              ) : null}
              {activePresetLoadSummary &&
              activePresetLoadSummary !== currentLoadSummary ? (
                <>{translate("uxChat.savedInPreset7uwpy", { p1: " ", p2: activePresetLoadSummary })}</>
              ) : null}
            </InfoHint>
          }
          defaultOpen={true}
          first={!hasModelContent && !modelConfig}
        >
          <div className="flex flex-col gap-2">
            <DropdownMenu>
                  <DropdownMenuTrigger asChild={true}>
                <div
                  className="w-full min-w-0 cursor-pointer outline-none focus-visible:outline-none"
                  aria-label={translate("uxChat.openPresetListd5aud")}
                >
                  <InputGroup className="panel-input-group">
                    <InputGroupInput
                      id="inference-preset-name"
                      value={presetNameInput}
                      onChange={(e) => setPresetNameInput(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          settingsHydrated &&
                          presetSaveState.canSubmit
                        ) {
                          e.preventDefault();
                          savePresetWithName(presetNameInput);
                        }
                        e.stopPropagation();
                      }}
                      placeholder={translate("uxChat.presetNameo0iip")}
                      maxLength={80}
                      autoComplete="off"
                      className={cn(
                        "!h-9 min-h-0 min-w-0 self-stretch !pl-3.5 !pr-2 py-0 text-ui-13 font-medium leading-9 text-nav-fg md:text-ui-13",
                        presetSaveState.isSaveReady &&
                          "placeholder:text-primary/50",
                      )}
                      aria-label={translate("uxChat.inferencePresetName1iohf")}
                    />
                    <InputGroupAddon
                      align="inline-end"
                      className="min-h-0 shrink-0 gap-0 self-stretch border-0 py-0 pl-0 !pr-1 has-[>button]:mr-0 !cursor-pointer"
                    >
                      <span
                        className="!h-7 min-h-7 !w-7 min-w-7 shrink-0 self-center inline-flex items-center justify-center rounded-full border-0 px-0 text-[#a0a097] dark:text-nav-fg pointer-events-none"
                        aria-hidden="true"
                      >
                        <HugeiconsIcon
                          icon={ChevronDownStandardIcon}
                          className="size-3.5"
                          strokeWidth={2}
                        />
                      </span>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={0}
                className="menu-soft-surface ring-0 border-0 rounded-lg p-1.5"
              >
                {presets.map((p, index) => (
                  <Fragment key={p.name}>
                    <DropdownMenuItem
                      disabled={!settingsHydrated}
                      onSelect={(event) => {
                        if (!settingsHydrated) {
                          event.preventDefault();
                          return;
                        }
                        applyPreset(p.name);
                      }}
                      className="flex min-h-9 items-center px-3 py-0 text-ui-13 font-medium leading-[1.4] tracking-nav"
                    >
                      {p.name}
                    </DropdownMenuItem>
                    {index === BUILTIN_PRESETS.length - 1 &&
                      presets.length > BUILTIN_PRESETS.length && (
                        <DropdownMenuSeparator className="mx-3 my-1.5 h-px bg-[rgb(6_29_33_/_calc(0.08*var(--contrast-wash-gain,1)))] dark:bg-[rgb(249_226_222_/_calc(0.08*var(--contrast-wash-gain,1)))]" />
                      )}
                  </Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Each pill is as wide as its label, not half the panel. */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => savePresetWithName(presetNameInput)}
                disabled={!(settingsHydrated && presetSaveState.canSubmit)}
                    variant={
                      presetSaveState.isSaveReady ? "default" : "outline"
                    }
                size="sm"
                className={cn(
                  "h-9 w-auto px-4 rounded-full text-ui-13 font-medium tracking-nav",
                  presetSaveState.isSaveReady &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                title={presetSaveState.title}
                aria-label={presetSaveState.title}
              >
                {presetSaveState.buttonLabel}
              </Button>
              <Button
                type="button"
                onClick={() => deletePreset(activePreset)}
                disabled={!(settingsHydrated && activeCustomPreset)}
                variant="outline"
                size="sm"
                className="h-9 w-auto px-4 rounded-full text-ui-13 font-medium tracking-nav text-muted-foreground"
                title={
                  activeCustomPreset
                    ? activeBuiltinPreset
                      ? translate("uxChat.resetSelectedPresetToher6s")
                      : translate("uxChat.deleteSelectedPreset1m26f")
                    : translate("uxChat.noSavedOverrideTofffyh")
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </CollapsibleSection>

        {showPromptCachingControl && activeExternalProvider ? (
          <CollapsibleSection label={translate("uxChat.providerevz7q")} defaultOpen={true}>
            <div className="flex min-h-8 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
                  {translate("uxChat.promptCachingl0i7g")}
                </span>
                <InfoHint>
                      {translate("uxCopy.reuseCompatiblePromptPrefixestyglp")}
                </InfoHint>
              </div>
              <Switch
                className="panel-switch shrink-0"
                checked={promptCachingEnabled}
                onCheckedChange={(checked) => {
                  onExternalProviderChange?.({
                    ...activeExternalProvider,
                    enablePromptCaching: checked,
                  });
                }}
                aria-label={translate("uxChat.enablePromptCaching7mds5")}
              />
            </div>
            {showPromptCacheTtlControl && promptCachingEnabled ? (
              <div className="flex min-h-8 items-center justify-between gap-3 pt-5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
                    {translate("uxChat.cacheTTL1lrwi")}
                  </span>
                  <InfoHint>
                    {translate("uxCopy.anthropicExposesA516x53")}
                  </InfoHint>
                </div>
                <Select
                  value={activeExternalProvider.promptCacheTtl ?? "5m"}
                  onValueChange={(value) => {
                    if (value !== "5m" && value !== "1h") return;
                    onExternalProviderChange?.({
                      ...activeExternalProvider,
                      promptCacheTtl: value,
                    });
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    icon={ChevronDownStandardIcon}
                    iconClassName="size-3.5"
                    className="panel-select-trigger shrink-0"
                    aria-label={translate("uxChat.promptCacheTTL1lnsu")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5m">{translate("uxChat.5Minutes1t033")}</SelectItem>
                    <SelectItem value="1h">{translate("uxChat.1Hour94dg9")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {showFastModeControl ? (
              <div className="flex min-h-8 items-center justify-between gap-3 pt-5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
                    {translate("uxChat.fastModee1cu5")}
                  </span>
                  <InfoHint>
                    {translate("uxCopy.researchPreviewUpTo1j1ts")}
                  </InfoHint>
                </div>
                <Switch
                  className="panel-switch shrink-0"
                  checked={Boolean(params.fastMode)}
                  onCheckedChange={set("fastMode")}
                  aria-label={translate("uxChat.fastModee1cu5")}
                />
              </div>
            ) : null}
          </CollapsibleSection>
        ) : null}

        {showOpenAICodeExecSection && activeExternalProvider ? (
          <CollapsibleSection label={translate("uxChat.codeExecutiono7fqi")} defaultOpen={false}>
            <OpenAICodeExecSection
              provider={activeExternalProvider}
              apiKey={openAiApiKeyForSection}
              activeThreadId={activeThreadId}
              onProviderChange={(p) => onExternalProviderChange?.(p)}
            />
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          label={translate("uxChat.systemPromptae4pi")}
          defaultOpen={true}
          onLabelClick={openSystemPromptEditor}
          headerAction={
            <Tooltip>
                  <TooltipPrimitive.Trigger asChild={true}>
                <button
                  type="button"
                  onClick={openSystemPromptEditor}
                  className="nav-icon-btn text-nav-icon-idle hover:bg-panel-surface-hover hover:text-[#061d21] dark:hover:text-[#f9e2de]"
                  aria-label={translate("uxChat.editSystemPromptczz9k")}
                >
                  <HugeiconsIcon
                    icon={Edit03Icon}
                    strokeWidth={1.75}
                    className="size-3"
                  />
                </button>
              </TooltipPrimitive.Trigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="tooltip-compact"
              >{translate("uxChat.editPromptwvqrk")}</TooltipContent>
            </Tooltip>
          }
        >
          {/* Rounded wrapper clips overflowing text and the scrollbar. */}
          <div
            className={cn(
              "panel-text-surface h-20 w-full overflow-hidden corner-squircle",
              systemPromptOverflows && "cursor-pointer",
            )}
          >
            <textarea
              ref={attachPromptBox}
              value={currentSystemPrompt}
              onChange={(e) => set("systemPrompt")(e.target.value)}
              onMouseDown={(e) => {
                // Overflowing prompt: click opens the popup editor instead. While focused, clicks still move
                // the caret normally.
                if (
                  systemPromptOverflows &&
                  document.activeElement !== e.currentTarget
                ) {
                  e.preventDefault();
                  openSystemPromptEditor();
                }
              }}
              placeholder={translate("uxChat.exampleYouAreA1cvco")}
              aria-label={translate("uxChat.systemPromptfkcu0")}
              className={cn(
                "block size-full resize-none bg-transparent px-3.5 py-2.5 text-left text-ui-13 font-medium leading-relaxed text-nav-fg outline-none placeholder:text-muted-foreground",
                systemPromptOverflows && "cursor-pointer",
              )}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection label={translate("uxChat.sampling18rwz")} defaultOpen={true}>
          <div className="flex flex-col gap-5">
            {showTemperature ? (
              <ParamSlider
                label={translate("settings.resources.liveMonitor.temperature")}
                value={params.temperature}
                min={0}
                max={2}
                step={0.01}
                onChange={set("temperature")}
                info={translate("uxChat.controlsRandomnessLowerValuespc80y")}
              />
            ) : null}
            {showTopP ? (
              <ParamSlider
                label={translate("uxChat.topP116ix")}
                value={params.topP}
                min={0}
                max={1}
                step={0.05}
                onChange={set("topP")}
                format={(v) => (v === 1 ? "Off" : undefined)}
                info={translate("uxChat.nucleusSamplingRestrictsChoicesovqbk")}
              />
            ) : null}
            {showTopK ? (
              <ParamSlider
                label={translate("uxChat.topK18o87")}
                value={params.topK}
                min={0}
                max={100}
                step={1}
                onChange={set("topK")}
                format={(v) => (v === 0 ? "Off" : undefined)}
                info={translate("uxChat.limitsSamplingToTheobd6s")}
              />
            ) : null}
            {showMinP ? (
              <div className="space-y-5">
                {isVllm ? (
                  <div className="space-y-1">
                    <Select
                      value={effectiveMinPMode(params)}
                      onValueChange={(value) => {
                        if (isMinPMode(value)) set("minPMode")(value);
                      }}
                    >
                      <SelectTrigger aria-label={translate("uxChat.minPModeuks7q")} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="server-default">
                          {translate("uxChat.serverDefault1ca3v")}
                        </SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {effectiveMinPMode(params) === "server-default" ? (
                      <p className="text-ui-11 text-muted-foreground">
                        {translate("uxChat.usesTheServerSnfp2a")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <ParamSlider
                  label={translate("uxChat.minP1sv4d")}
                  value={params.minP}
                  disabled={
                    isVllm && effectiveMinPMode(params) === "server-default"
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={set("minP")}
                  info={translate("uxChat.dropsTokensWhoseProbabilityw6coc")}
                />
              </div>
            ) : null}
            {showRepetitionPenalty ? (
              <ParamSlider
                label={translate("uxChat.repetitionPenalty18rwn")}
                value={params.repetitionPenalty}
                min={1}
                max={2}
                step={0.05}
                onChange={set("repetitionPenalty")}
                format={(v) => (v === 1 ? "Off" : undefined)}
                info={translate("uxChat.downWeightsTokensThatcdg9f")}
              />
            ) : null}
            {showPresencePenalty ? (
              <ParamSlider
                label={translate("uxChat.presencePenalty197nw")}
                value={params.presencePenalty}
                min={0}
                max={2}
                step={0.1}
                onChange={set("presencePenalty")}
                format={(v) => (v === 0 ? "Off" : undefined)}
                info={translate("uxChat.penalizesAnyTokenThatgdd1c")}
              />
            ) : null}
            <ParamSlider
              label={translate("uxChat.maxTokens989yw")}
              value={params.maxTokens}
              min={
                isExternalModel
                  ? getExternalMinOutputTokens(externalProviderType)
                  : MAX_TOKENS_MIN
              }
              max={maxTokensMax}
              step={64}
              onChange={set("maxTokens")}
              format={(v) =>
                !isExternalModel && v >= maxTokensMax ? "Max" : undefined
              }
              info={translate("uxChat.maximumNumberOfTokensj5vfb")}
            />
            {showSeed ? (
              <div className="flex min-h-8 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
                    {translate("uxVideo.seed1lu3q")}
                  </span>
                  <InfoHint>{translate("uxChat.pinsTheSamplingDrawapcxt")}</InfoHint>
                </div>
                {/* A plain field, sized like the model rows': the input group
                    it used to sit in is 36px and full width. */}
                <input
                  id="inference-seed"
                  // A TEXT input: type="number" reports an unreadable entry as "", clearing the pin.
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={
                    seedDraft ?? (params.seed == null ? "" : String(params.seed))
                  }
                  onChange={(e) =>
                    setSeedDraft(e.target.value.replace(/\D/g, ""))
                  }
                  onBlur={() => {
                    if (seedDraft === null) return;
                    setSeedDraft(null);
                    setSeed(committedSeed);
                  }}
                  onKeyDown={(e) => {
                    // Blur is the only commit, so Enter has to reach it.
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  placeholder={translate("uxChat.randomi2496")}
                  aria-label={translate("uxVideo.seed1lu3q")}
                  className="panel-field h-8 w-[calc(84px*var(--ui-space-scale,1))] shrink-0"
                />
              </div>
            ) : null}
          </div>
        </CollapsibleSection>

            {showStudioToolLoopControls ? (
          <CollapsibleSection label={translate("composer.pill.tools")}>
            <div className="flex flex-col gap-5">
              {isExternalModel ? null : (
                <>
                  <AutoHealToolCallsToggle />
                  <NudgeToolCallsToggle />
                </>
              )}
              <DeduplicateToolCallsToggle />
              {isExternalModel ? null : (
                <>
                  <ConfirmToolCallsToggle />
                  <BypassPermissionsToggle />
                </>
              )}
              <MaxToolCallsSlider />
              <ToolCallTimeoutSlider />
            </div>
          </CollapsibleSection>
            ) : null}

            {isExternalModel ? null : (
          <CollapsibleSection label={translate("uxChat.retrievalste5q")}>
            <RetrievalSettingsSection />
          </CollapsibleSection>
            )}
      </div>
      </div>
      </div>
      <Dialog
        open={systemPromptEditorOpen}
        onOpenChange={(nextOpen) => {
          setSystemPromptEditorOpen(nextOpen);
        }}
      >
        <DialogContent className="corner-squircle dialog-soft-surface sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{translate("uxCopy.editSystemPromptmau36")}</DialogTitle>
            <DialogDescription>
              {translate("uxCopy.thisPromptIsPartegqlp")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-0.5 px-0.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-ui-11 font-medium">{translate("uxChat.promptEditorjs0ht")}</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSystemVariablesOpen((open) => !open)}
                  className="h-7 gap-1.5 rounded-full px-2.5 text-ui-11 text-muted-foreground"
                  aria-expanded={systemVariablesOpen}
                >
                  <Braces className="size-3.5" />
                  {translate("uxChat.variablesxqivz")}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      systemVariablesOpen && "rotate-180",
                    )}
                  />
                </Button>
              </div>
              <p className="text-ui-11 text-muted-foreground">{translate("uxChat.useThisForLonger54zlo", { p1: "{{ env }}" })}</p>
            </div>
            {systemVariablesOpen ? (
              <div className="space-y-2 px-0.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-ui-11 font-medium">
                      {translate("uxChat.promptVariables1oce3")}
                    </div>
                    <p className="text-ui-11 text-muted-foreground">{translate("uxChat.defineValuesAsJSONycty1", { p1: "{{ env }}" })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-ui-10 text-muted-foreground">
                      {translate("uxChat.builtInFillIn12qwf")}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {["{{$date}}", "{{$time}}", "{{$now}}"].map((token) => (
                        <span
                          key={token}
                          title={translate("uxChat.isReplacedAutomaticallyWhenn4lma", { p1: token })}
                          className="rounded-full bg-muted px-2 py-0.5 font-mono text-ui-10 text-muted-foreground"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Textarea
                  value={systemVariablesDraft}
                  onChange={(event) =>
                    setSystemVariablesDraft(event.target.value)
                  }
                  placeholder='{ "env": "staging", "version": "v2.3.1" }'
                  fieldSizing="fixed"
                  className={cn(
                    "min-h-24 border-0 font-mono text-xs leading-5 corner-squircle focus-visible:ring-0",
                    systemVariablesError &&
                      "ring-1 ring-destructive focus-visible:ring-destructive",
                  )}
                  rows={5}
                  aria-label={translate("uxChat.promptVariablesJSON85bjo")}
                  aria-invalid={Boolean(systemVariablesError)}
                />
                {systemVariablesError ? (
                  <p className="px-1 text-ui-11 text-destructive">
                    {systemVariablesError}
                  </p>
                ) : (
                  <p className="px-1 text-ui-11 text-muted-foreground">{translate("uxChat.namesYouDonT29sx4", { p1: " {{ typo }} " })}</p>
                )}
              </div>
            ) : null}
            {/* Squircle on the wrapper: Chrome leaves a scroll area's own
                corners square. */}
            <div className="corner-squircle overflow-hidden rounded-xl">
              <Textarea
                value={systemPromptDraft}
                onChange={(event) => setSystemPromptDraft(event.target.value)}
                placeholder={translate("uxChat.youAreAHelpful1cb6u")}
                fieldSizing="fixed"
                className="min-h-[min(calc(20rem*var(--ui-space-scale,1)),48dvh)] max-h-[48dvh] overflow-y-auto rounded-none border-0 text-sm leading-6 focus-visible:ring-0"
                rows={14}
              />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSystemPromptDraft("")}
              disabled={systemPromptDraft.length === 0}
              className="text-muted-foreground"
            >
              Reset
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSystemPromptDraft(currentSystemPrompt);
                  setSystemVariablesDraft(currentSystemVariables);
                  setSystemPromptEditorOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveSystemPromptEditor}
                disabled={
                  !systemPromptEditorDirty || Boolean(systemVariablesError)
                }
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (isCompact) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(calc(18rem*var(--ui-space-scale,1)),100vw)] p-0 font-heading">
          <SheetHeader className="sr-only">
            <SheetTitle>{translate("uxChat.runSettingshtgkw")}</SheetTitle>
            <SheetDescription>{translate("uxCopy.chatInferenceSettings1qjs9")}</SheetDescription>
          </SheetHeader>
          <div data-tour="chat-settings" className="flex h-full flex-col">
            {settingsContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      ref={asideRef}
      data-tour="chat-settings"
      data-slot="chat-settings-panel"
      inert={!open}
      className={cn(
        "relative z-50 shrink-0 bg-panel-surface text-panel-surface-fg font-heading",
        open ? "w-(--chat-settings-width)" : "w-0 overflow-hidden",
      )}
      style={
        {
          "--chat-settings-width": `${settingsWidth * settingsScale}px`,
          height: "calc(100% - var(--studio-custom-titlebar-height, 0px))",
          marginTop: "var(--studio-custom-titlebar-height, 0px)",
        } as CSSProperties
      }
    >
      {open ? (
      <PanelResizeHandle
        edge="left"
        open={open}
        width={settingsWidth}
        stored={settingsStored}
        min={CHAT_SETTINGS_WIDTH_MIN}
        max={settingsMax}
        scale={settingsScale}
        clamp={clampChatSettingsWidth}
        setWidth={setSettingsWidth}
        resetWidth={resetSettingsWidth}
        onToggle={() => onOpenChange?.(!open)}
        target={() => asideRef.current}
        cssVar="--chat-settings-width"
        measure={() => (asideRef.current?.getBoundingClientRect().width ?? 0) / settingsScale}
        label={t("shell.aria.resizeRunSettings")}
        toggleLabel={t("shell.aria.openRunSettings")}
        collapseHint={t("shell.resize.collapse")}
        expandHint={t("shell.resize.expand")}
        dragHint={t("shell.resize.drag")}
        dataSlot="chat-settings-resize-handle"
      />
      ) : null}
      <div
        className={cn(
          "h-full w-full overflow-hidden",
          open && "border-l border-panel-edge",
        )}
      >
        {settingsContent}
      </div>
    </aside>
  );
}

function MaxToolCallsSlider() {
  const maxToolCalls = useChatRuntimeStore((s) => s.maxToolCallsPerMessage);
  const setMaxToolCalls = useChatRuntimeStore(
    (s) => s.setMaxToolCallsPerMessage,
  );

  // Slider range 0-41; 41 maps to 9999 ("Max")
  const sliderValue = maxToolCalls >= 9999 ? 41 : Math.min(maxToolCalls, 40);

  return (
    <ParamSlider
      label={translate("uxChat.maxToolCallsPerbadz3")}
      value={sliderValue}
      min={0}
      max={41}
      step={1}
      onChange={(v) => setMaxToolCalls(v >= 41 ? 9999 : v)}
      format={(v) => (v >= 41 ? "Max" : v === 0 ? "Off" : undefined)}
      info="Cap on tool/function calls the model may invoke within a single response. 0 disables tool use; Max removes the cap."
    />
  );
}

function ToolCallTimeoutSlider() {
  const timeout = useChatRuntimeStore((s) => s.toolCallTimeout);
  const setTimeout_ = useChatRuntimeStore((s) => s.setToolCallTimeout);

  // Slider 1-31; 31 maps to 9999 ("Max")
  const sliderValue = timeout >= 9999 ? 31 : Math.min(Math.max(timeout, 1), 30);

  return (
    <ParamSlider
      label={translate("uxChat.maxToolCallDurationz8vho")}
      value={sliderValue}
      min={1}
      max={31}
      step={1}
      onChange={(v) => setTimeout_(v >= 31 ? 9999 : v)}
      format={(v) =>
        v >= 31 ? "Max" : v === 1 ? "1 minute" : `${v} minutes`
      }
      valueSize={10}
      info={translate("uxChat.perCallWallClockk0ery")}
    />
  );
}

function AutoHealToolCallsToggle() {
  const autoHealToolCalls = useChatRuntimeStore((s) => s.autoHealToolCalls);
  const setAutoHealToolCalls = useChatRuntimeStore(
    (s) => s.setAutoHealToolCalls,
  );

  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
          {translate("uxChat.autoHealingToolCallsgeh1y")}
        </span>
        <InfoHint>{translate("uxChat.lAiMAutoFixesBrokenxsua8")}</InfoHint>
      </div>
      <Switch
        className="panel-switch shrink-0"
        checked={autoHealToolCalls}
        onCheckedChange={setAutoHealToolCalls}
      />
    </div>
  );
}

function NudgeToolCallsToggle() {
  const nudgeToolCalls = useChatRuntimeStore((s) => s.nudgeToolCalls);
  const setNudgeToolCalls = useChatRuntimeStore((s) => s.setNudgeToolCalls);

  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
          {translate("uxChat.nudgeToolCallsellsx")}
        </span>
        <InfoHint>
          {translate("uxCopy.whenAToolCall1f9iy")}
        </InfoHint>
      </div>
      <Switch
        className="panel-switch shrink-0"
        checked={nudgeToolCalls}
        onCheckedChange={setNudgeToolCalls}
      />
    </div>
  );
}

function DeduplicateToolCallsToggle() {
  const deduplicateToolCalls = useChatRuntimeStore(
    (s) => s.deduplicateToolCalls,
  );
  const setDeduplicateToolCalls = useChatRuntimeStore(
    (s) => s.setDeduplicateToolCalls,
  );

  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
          {translate("uxChat.deduplicateToolCalls159ox")}
        </span>
        <InfoHint>
          {translate("uxCopy.skipsAToolCall1vwc7")}
        </InfoHint>
      </div>
      <Switch
        className="panel-switch shrink-0"
        checked={deduplicateToolCalls}
        onCheckedChange={setDeduplicateToolCalls}
      />
    </div>
  );
}

function ConfirmToolCallsToggle() {
  const setConfirmToolCalls = useChatRuntimeStore((s) => s.setConfirmToolCalls);
  const setPermissionMode = useChatRuntimeStore((s) => s.setPermissionMode);
  const permissionMode = useChatRuntimeStore((s) => s.permissionMode);

  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
            {translate("uxChat.confirmToolCallsb9v1c")}
          </span>
          <InfoHint>{translate("uxChat.whenOnEveryLocal65ppu")}</InfoHint>
        </div>
        {permissionMode === "full" ? (
          <span className="text-ui-11 text-muted-foreground">
            {translate("uxChat.overriddenByFullAccesswddwj")}
          </span>
        ) : null}
      </div>
      <Switch
        className="panel-switch shrink-0"
        checked={permissionMode === "ask"}
        onCheckedChange={(checked) => {
          if (checked) {
            setConfirmToolCalls(true);
          } else {
            // Same as picking "Run automatically".
            setPermissionMode("off");
          }
        }}
        disabled={permissionMode === "full"}
      />
    </div>
  );
}

function BypassPermissionsToggle() {
  const permissionMode = useChatRuntimeStore((s) => s.permissionMode);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="whitespace-nowrap text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
          {translate("settings.general.permissions.sectionTitle")}
        </span>
        <InfoHint>
          {translate("uxCopy.chooseHowLAiMApproveskz606")}
        </InfoHint>
      </div>
      {/* Full width, styled like the panel selects/preset input. */}
      <PermissionModeDropdown triggerClassName="h-9 w-full justify-between rounded-full border-0 bg-[var(--panel-input-surface)] px-3.5 text-ui-13 font-medium text-nav-fg shadow-none hover:bg-[var(--panel-input-surface)]" />
      {permissionMode === "full" ? (
        <span className="text-ui-11 text-muted-foreground">
          {translate("uxChat.toolCallsRunWith1hbvx")}
        </span>
      ) : null}
    </div>
  );
}

