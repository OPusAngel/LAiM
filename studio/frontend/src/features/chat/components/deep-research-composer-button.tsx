// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { Button } from "@/components/ui/button";
import { translate, useT } from "@/i18n";
import { Telescope02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChevronDownStandardIcon } from "@/lib/chevron-icons";
import { XIcon } from "lucide-react";
import {
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import {
  listResearchMcpTools,
  type ResearchMcpTool,
} from "../api/mcp-servers-api";
import {
  DEFAULT_RESEARCH_MODEL_TIMEOUT_SECONDS,
  MAX_RESEARCH_MCP_SOURCES,
  useChatRuntimeStore,
} from "../stores/chat-runtime-store";
import { MAX_RESEARCH_MODEL_TIMEOUT_SECONDS } from "../utils/mirrored-chat-settings";
import type {
  ResearchMcpSource,
  ResearchWebsitePolicy,
} from "../types/research";

// the backend caps seconds; this field takes minutes.
const MAX_RESEARCH_MODEL_TIMEOUT_MINUTES = Math.floor(
  MAX_RESEARCH_MODEL_TIMEOUT_SECONDS / 60,
);

function normalizeDomain(raw: string): string | null {
  const value = raw.trim();
  if (!value || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }
    return url.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
  } catch {
    return null;
  }
}

function DomainList({
  label,
  description,
  values,
  onChange,
}: {
  label: string;
  description: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const addDraft = () => {
    if (!draft.trim()) return;
    const domain = normalizeDomain(draft);
    if (!domain) {
      setError(translate("uxChat.enterADomainWithoutybtrd"));
      return;
    }
    if (values.length >= 100 && !values.includes(domain)) {
      setError(translate("uxChat.youCanAddUp5ay11"));
      return;
    }
    if (!values.includes(domain)) onChange([...values, domain]);
    setDraft("");
    setError("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {/* One Input-styled field with the domains as chips. A click anywhere focuses it. */}
      <div
        onClick={(event) => event.currentTarget.querySelector("input")?.focus()}
        className={cn(
          "flex min-h-9 cursor-text flex-wrap items-center gap-1 rounded-[18px] border border-border bg-background px-1.5 py-[3px] transition-colors focus-within:border-ring dark:border-transparent dark:bg-[rgb(249_226_222_/_calc(0.06*var(--contrast-wash-gain,1)))] dark:focus-within:bg-[rgb(249_226_222_/_calc(0.12*var(--contrast-wash-gain,1)))]",
          error && "border-destructive ring-[3px] ring-destructive/20 dark:border-destructive/50",
        )}
      >
        {values.map((domain) => (
          <span
            key={domain}
            className="flex h-7 items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--foreground)_calc(10%*var(--contrast-wash-gain,1)),transparent)] pl-2.5 pr-1.5 text-xs font-medium"
          >
            {domain}
            <button
              type="button"
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_calc(10%*var(--contrast-wash-gain,1)),transparent)] hover:text-foreground"
              aria-label={translate("uxChat.removecucki", { p1: domain })}
              onClick={() =>
                onChange(values.filter((value) => value !== domain))
              }
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
          onBlur={addDraft}
          onKeyDown={handleKeyDown}
          placeholder={values.length ? translate("uxChat.addAnotherDomaine82pn") : "example.com"}
          aria-label={label}
          aria-invalid={Boolean(error)}
          className="h-7 min-w-32 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

const matches = (tool: ResearchMcpTool, value: ResearchMcpSource) =>
  value.serverId === tool.serverId && value.tool === tool.tool;

function McpSourceList({
  values,
  onChange,
}: {
  values: ResearchMcpSource[];
  onChange: Dispatch<SetStateAction<ResearchMcpSource[]>>;
}) {
  const [tools, setTools] = useState<ResearchMcpTool[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listResearchMcpTools().then(
      (found) => {
        if (cancelled) return;
        setTools(found);
      },
      () => {
        if (!cancelled) setTools([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  const unavailableValues = values.filter(
    (value) => tools !== null && !tools.some((tool) => matches(tool, value)),
  );

  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{translate("uxCopy.mCPSearchSourcesku27s")}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{translate("uxChat.everyResearchSearchAlsodxaig", { p1: MAX_RESEARCH_MCP_SOURCES })}</p>
      </div>
      {tools === null ? (
        <p className="text-xs text-muted-foreground">{translate("uxChat.loadingMCPToolsputdw")}</p>
      ) : tools.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {translate("uxChat.noEnabledMCPServerwcow2")}
        </p>
      ) : (
        tools.map((tool) => (
          <label
            key={`${tool.serverId}:${tool.tool}`}
            className="flex cursor-pointer items-start justify-between gap-6"
          >
            <span className="min-w-0">
              <span className="block break-words text-sm">
                {tool.serverName} · {tool.tool}
              </span>
              {tool.description ? (
                <span className="block line-clamp-2 text-xs text-muted-foreground">
                  {tool.description}
                </span>
              ) : null}
            </span>
            <Switch
              checked={values.some((value) => matches(tool, value))}
              disabled={
                !values.some((value) => matches(tool, value)) &&
                values.length >= MAX_RESEARCH_MCP_SOURCES
              }
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [
                        ...values,
                        { serverId: tool.serverId, tool: tool.tool },
                      ].slice(0, MAX_RESEARCH_MCP_SOURCES)
                    : values.filter(
                        (value) => !matches(tool, value),
                      ),
                )
              }
              aria-label={translate("uxChat.searchWithztlov", { p1: tool.serverName, p2: tool.tool })}
            />
          </label>
        ))
      )}
      {unavailableValues.map((value) => (
        <div
          key={`${value.serverId}:${value.tool}`}
          className="flex items-start justify-between gap-6"
        >
          <span className="min-w-0 break-words text-sm">
            {value.serverId} · {value.tool}
            <span className="block text-xs text-muted-foreground">
              {translate("uxChat.currentlyUnavailableSelectionKept17j26")}
            </span>
          </span>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            aria-label={translate("uxChat.removeUnavailableSource7g97g", { p1: value.serverId, p2: value.tool })}
            onClick={() =>
              onChange(values.filter((item) =>
                item.serverId !== value.serverId || item.tool !== value.tool,
              ))
            }
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export function DeepResearchComposerButton({
  onConfigure,
}: {
  onConfigure: () => void;
}) {
  const t = useT();
  const enabled = useChatRuntimeStore((state) => state.deepResearchEnabled);
  const setEnabled = useChatRuntimeStore(
    (state) => state.setDeepResearchEnabled,
  );

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={onConfigure}
      className="composer-pill-btn"
      data-pill-label={t("composer.pill.deepResearch")}
      data-active="true"
      aria-label={translate("uxChat.configureDeepResearchWebsitez3oq8")}
      title={translate("uxChat.configureWebsiteAccess1p4yq")}
    >
      <span
        role="button"
        aria-label={translate("uxChat.disableDeepResearchx3563")}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setEnabled(false);
        }}
        className="composer-pill-glyph cursor-pointer"
      >
        <HugeiconsIcon icon={Telescope02Icon} className="size-[calc(15px*var(--ui-space-scale,1))]" />
        <XIcon className="composer-pill-x" />
      </span>
      <span>{t("composer.pill.deepResearch")}</span>
      {/* Same caret as the other composer pills, so the arrows match. */}
      <HugeiconsIcon
        icon={ChevronDownStandardIcon}
        strokeWidth={1.5}
        className="composer-pill-caret size-[calc(15px*var(--ui-space-scale,1))] text-primary/70"
      />
    </button>
  );
}

export function DeepResearchWebsiteAccessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const policy = useChatRuntimeStore((state) => state.researchWebsitePolicy);
  const setPolicy = useChatRuntimeStore(
    (state) => state.setResearchWebsitePolicy,
  );
  const modelTimeoutSeconds = useChatRuntimeStore(
    (state) => state.researchModelTimeoutSeconds,
  );
  const setModelTimeoutSeconds = useChatRuntimeStore(
    (state) => state.setResearchModelTimeoutSeconds,
  );
  const mcpSources = useChatRuntimeStore((state) => state.researchMcpSources);
  const setMcpSources = useChatRuntimeStore(
    (state) => state.setResearchMcpSources,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DeepResearchWebsiteAccessContent
          policy={policy}
          setPolicy={setPolicy}
          modelTimeoutSeconds={modelTimeoutSeconds}
          setModelTimeoutSeconds={setModelTimeoutSeconds}
          mcpSources={mcpSources}
          setMcpSources={setMcpSources}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function DeepResearchWebsiteAccessContent({
  policy,
  setPolicy,
  modelTimeoutSeconds,
  setModelTimeoutSeconds,
  mcpSources,
  setMcpSources,
  onClose,
}: {
  policy: ResearchWebsitePolicy;
  setPolicy: (policy: ResearchWebsitePolicy) => void;
  modelTimeoutSeconds: number;
  setModelTimeoutSeconds: (seconds: number) => void;
  mcpSources: ResearchMcpSource[];
  setMcpSources: (sources: ResearchMcpSource[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ResearchWebsitePolicy>(policy);
  const [mcpDraft, setMcpDraft] = useState<ResearchMcpSource[]>(mcpSources);
  const [unlimited, setUnlimited] = useState(modelTimeoutSeconds === 0);
  // re-enabling the limit from unlimited starts at the default.
  const [timeoutMinutes, setTimeoutMinutes] = useState(
    String(
      Math.ceil(
        (modelTimeoutSeconds || DEFAULT_RESEARCH_MODEL_TIMEOUT_SECONDS) / 60,
      ),
    ),
  );
  // preserve stored seconds when the rounded minutes field is untouched.
  const [timeoutEdited, setTimeoutEdited] = useState(false);

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        {/* Icon and title, as in the Skills dialog. */}
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Telescope02Icon} strokeWidth={1.75} className="size-5 text-primary" />
          <DialogTitle>{translate("uxChat.deepResearchhwj3y")}</DialogTitle>
        </div>
        <DialogDescription>
          {translate("uxCopy.controlWebsiteAccessAndzghta")}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-6">
            <div>
              {/* A run makes many model requests, so this bounds each one, not the run. */}
              <div className="text-sm font-medium">{translate("uxCopy.timePerModelRequest1pitq")}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {unlimited
                  ? translate("uxChat.noLimitOnAgstlb")
                  : translate("uxChat.maximumTimeForEachq38q8")}
              </p>
            </div>
            {/* A switch: it is a state, so its label never flips. */}
            <label
              htmlFor="research-no-time-limit"
              className="flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-sm text-muted-foreground"
            >{translate("uxChat.noLimitcfknv")}<Switch
                id="research-no-time-limit"
                checked={unlimited}
                onCheckedChange={(checked) => {
                  setTimeoutEdited(true);
                  setUnlimited(checked);
                }}
              />
            </label>
          </div>
          {unlimited ? null : (
            <div className="flex items-center gap-2.5">
              <Input
                type="number"
                min="1"
                max={MAX_RESEARCH_MODEL_TIMEOUT_MINUTES}
                step="1"
                value={timeoutMinutes}
                onChange={(event) => {
                  setTimeoutEdited(true);
                  setTimeoutMinutes(event.target.value);
                }}
                aria-label={translate("uxChat.deepResearchTimePer1iu8q")}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          )}
        </div>
        <DomainList
          label={translate("uxChat.allowOnlydth4g")}
          description={translate("uxChat.whenSetResearchCanah7yg")}
          values={draft.allowedDomains}
          onChange={(allowedDomains) => setDraft({ ...draft, allowedDomains })}
        />
        <DomainList
          label={translate("browser.downloadSiteBlock")}
          description={translate("uxChat.theseDomainsAndTheir1t76p")}
          values={draft.blockedDomains}
          onChange={(blockedDomains) => setDraft({ ...draft, blockedDomains })}
        />
        <McpSourceList values={mcpDraft} onChange={setMcpDraft} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {translate("browser.agentSettings.cancel")}
        </Button>
        <Button
          onClick={() => {
            setPolicy(draft);
            setMcpSources(mcpDraft);
            const minutes = Number(timeoutMinutes);
            // typed values bypass max; clamp to avoid a short default timeout.
            setModelTimeoutSeconds(
              unlimited
                ? 0
                : !timeoutEdited
                  ? modelTimeoutSeconds
                  : Number.isSafeInteger(minutes) && minutes >= 1
                    ? Math.min(minutes, MAX_RESEARCH_MODEL_TIMEOUT_MINUTES) * 60
                    : DEFAULT_RESEARCH_MODEL_TIMEOUT_SECONDS,
            );
            onClose();
          }}
        >{translate("uxChat.saveLimitsdu6yh")}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

