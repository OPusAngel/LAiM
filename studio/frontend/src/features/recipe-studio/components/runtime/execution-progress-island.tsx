// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  ChevronDownStandardIcon,
  ChevronUpStandardIcon,
} from "@/lib/chevron-icons";
import { cn } from "@/lib/utils";
import { CheckmarkCircle02Icon, Flag02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactElement } from "react";
import type { RecipeExecutionRecord } from "../../execution-types";
import { isExecutionInProgress } from "../../executions/execution-helpers";
import {
  formatMetricValue,
  formatPercent,
} from "../executions/executions-view-helpers";

type ExecutionProgressIslandProps = {
  execution: RecipeExecutionRecord;
  currentColumnIcon: typeof Flag02Icon;
  minimized: boolean;
  onMinimizedChange: (value: boolean) => void;
  onViewExecutions: () => void;
};

function formatEta(value: number | null | undefined): string {
  const metric = formatMetricValue(value);
  if (metric === "--") {
    return "--";
  }
  return `${metric}s`;
}

function statusLabel(input: {
  complete: boolean;
  inProgress: boolean;
}): string {
  if (input.complete) {
    return translate("uxRecipestudio.runCompleteds6dh2");
  }
  if (input.inProgress) {
    return translate("uxRecipestudio.runInProgressdvmfp");
  }
  return translate("uxRecipestudio.runStatusq1z45");
}

function formatSourceResource(value: string | null | undefined): string {
  if (value === "pulls") {
    return "PRs";
  }
  return value ?? "source";
}

function formatGitHubSourceSummary(
  execution: RecipeExecutionRecord,
): string | null {
  const source = execution.source_progress;
  if (!source || source.source !== "github") {
    return null;
  }
  if (source.status === "rate_limited") {
    const wait =
      typeof source.retry_after_sec === "number" && source.retry_after_sec > 0
        ? ` ~${formatMetricValue(source.retry_after_sec)}s`
        : "";
    return translate("uxRecipestudio.waitingForGitHubRatev403x", { p1: wait });
  }
  if (source.status === "retrying") {
    return source.message ?? translate("uxRecipestudio.githubRequestFailed94joq");
  }

  const parts = [
    source.repo,
    source.resource
      ? `${formatSourceResource(source.resource)}${
          typeof source.page === "number" ? ` page ${source.page}` : ""
        }`
      : null,
    typeof source.fetched_items === "number"
      ? `${formatMetricValue(source.fetched_items)} fetched`
      : null,
    typeof source.rate_remaining === "number"
      ? `remaining ${formatMetricValue(source.rate_remaining)}`
      : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return source.message ?? translate("uxRecipestudio.crawlingGitHubSourceho10e");
  }
  return parts.join(" · ");
}

export function ExecutionProgressIsland({
  execution,
  currentColumnIcon,
  minimized,
  onMinimizedChange,
  onViewExecutions,
}: ExecutionProgressIslandProps): ReactElement {
  const complete = execution.status === "completed";
  const inProgress = isExecutionInProgress(execution.status);
  const sourceSummary = formatGitHubSourceSummary(execution);
  const showSourceProgress = Boolean(
    sourceSummary &&
      inProgress &&
      (execution.stage === "source" ||
        execution.source_progress?.status === "rate_limited" ||
        execution.source_progress?.status === "retrying"),
  );
  const sourcePercent = showSourceProgress
    ? execution.source_progress?.percent
    : null;
  const progressPercent =
    sourcePercent ?? execution.progress?.percent ?? (complete ? 100 : 0);
  const hasProgressSignal = Boolean(
    (execution.progress &&
      (typeof execution.progress.done === "number" ||
        typeof execution.progress.total === "number" ||
        typeof execution.progress.percent === "number" ||
        typeof execution.progress.rate === "number" ||
        typeof execution.progress.eta_sec === "number")) ||
      typeof sourcePercent === "number",
  );
  const showLoadingSpinner = inProgress && !hasProgressSignal;
  const batchTotal = execution.batch?.total ?? null;
  const showBatch = typeof batchTotal === "number" && batchTotal > 1;

  return (
    <div
      className={cn(
        "w-[clamp(15rem,26vw,20rem)] max-w-[calc(100vw-1rem)] rounded-b-xl border-x border-b bg-card/96 shadow-sm backdrop-blur-sm transition-all",
        minimized ? "min-h-[calc(3rem*var(--ui-space-scale,1))]" : "min-h-[calc(8.5rem*var(--ui-space-scale,1))]",
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <HugeiconsIcon
            icon={complete ? CheckmarkCircle02Icon : Flag02Icon}
            className={cn(
              "size-3.5",
              complete
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300",
            )}
          />
          <p className="truncate text-xs font-medium text-foreground">
            {statusLabel({ complete, inProgress })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showLoadingSpinner && (
            <Spinner className="size-3.5 text-muted-foreground" />
          )}
          <span className="shrink-0 text-ui-11 text-muted-foreground">
            {formatPercent(progressPercent)}
          </span>
          <button
            type="button"
            onClick={() => onMinimizedChange(!minimized)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded border border-border/70 text-muted-foreground transition hover:bg-muted/50"
            aria-label={minimized ? translate("uxRecipestudio.expandProgress35mjg") : translate("uxRecipestudio.minimizeProgressncz60")}
            title={minimized ? "Expand" : "Minimize"}
          >
            <HugeiconsIcon
              icon={minimized ? ChevronDownStandardIcon : ChevronUpStandardIcon}
              className="size-3.5"
            />
          </button>
        </div>
      </div>

      <div className="px-3">
        <Progress value={progressPercent} className="h-1" />
      </div>

      {!minimized && (
        <>
          <div className="grid grid-cols-2 gap-2 px-3 pt-2 text-ui-11 text-muted-foreground sm:grid-cols-4">
            <p
              className="truncate"
              title={`Done: ${formatMetricValue(execution.progress?.done)}`}
            >{translate("uxRecipestudio.donezmtvo", { p1: formatMetricValue(execution.progress?.done) })}</p>
            <p
              className="truncate"
              title={`Total: ${formatMetricValue(execution.progress?.total)}`}
            >{translate("uxRecipestudio.totaly8zva", { p1: formatMetricValue(execution.progress?.total) })}</p>
            <p
              className="truncate"
              title={`Rate: ${formatMetricValue(execution.progress?.rate)}`}
            >{translate("uxRecipestudio.rategk415", { p1: formatMetricValue(execution.progress?.rate) })}</p>
            <p
              className="truncate"
              title={`ETA: ${formatEta(execution.progress?.eta_sec)}`}
            >{translate("uxRecipestudio.eTAy2tv9", { p1: formatEta(execution.progress?.eta_sec) })}</p>
          </div>
          {showSourceProgress ? (
            <div className="mt-1 flex items-center gap-1.5 px-3 text-ui-11 text-muted-foreground">
              <HugeiconsIcon
                icon={Flag02Icon}
                className="size-3.5 shrink-0 text-amber-700 dark:text-amber-300"
              />
              <p className="truncate" title={sourceSummary ?? undefined}>{translate("uxRecipestudio.gitHubSourcey5yno", { p1: sourceSummary })}</p>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-1.5 px-3 text-ui-11 text-muted-foreground">
              <HugeiconsIcon
                icon={currentColumnIcon}
                className="size-3.5 shrink-0"
              />
              <p className="truncate" title={execution.current_column ?? "--"}>{translate("uxRecipestudio.columnllylq", { p1: execution.current_column ?? "--" })}</p>
            </div>
          )}
          {showBatch && (
            <div
              className="mt-1 truncate px-3 text-ui-11 text-muted-foreground"
              title={`Batch: ${execution.batch?.idx ?? "--"}/${execution.batch?.total ?? "--"}`}
            >{translate("uxRecipestudio.batchkxfc3", { p1: execution.batch?.idx ?? "--", p2: execution.batch?.total ?? "--" })}</div>
          )}
          <div className="px-3 pb-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full text-ui-11"
              onClick={onViewExecutions}
            >
              {translate("uxCopy.viewRunDetails1bjmk")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
