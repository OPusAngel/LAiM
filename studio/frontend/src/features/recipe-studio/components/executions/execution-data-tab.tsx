// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { ReactElement } from "react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { isExecutionInProgress } from "../../executions/execution-helpers";
import type { RecipeExecutionRecord } from "../../execution-types";
import { formatMetricValue } from "./executions-view-helpers";

function formatSourceResource(value: string | null | undefined): string {
  if (value === "pulls") {
    return "PRs";
  }
  return value ?? "--";
}

function formatFetchedValue(execution: RecipeExecutionRecord): string {
  const source = execution.source_progress;
  if (!source) {
    return "--";
  }
  const fetched = formatMetricValue(source.fetched_items);
  if (typeof source.estimated_total !== "number" || source.estimated_total <= 0) {
    return fetched;
  }
  return `${fetched} / ${formatMetricValue(source.estimated_total)}`;
}

function formatGitHubSourceMessage(execution: RecipeExecutionRecord): string {
  const source = execution.source_progress;
  if (!source) {
    return translate("uxRecipestudio.collectingRepositoryThreadsBeforaebtc");
  }
  if (source.status === "rate_limited") {
    return source.message ?? translate("uxRecipestudio.waitingForGitHubRaterub96");
  }
  return source.message ?? translate("uxRecipestudio.collectingRepositoryThreadsBeforaebtc");
}

function RunningDatasetEmptyState({
  execution,
  onOpenOverview,
}: {
  execution: RecipeExecutionRecord;
  onOpenOverview: () => void;
}): ReactElement {
  const source = execution.source_progress;
  if (source?.source === "github") {
    const title =
      source.status === "rate_limited"
        ? translate("uxRecipestudio.waitingForGitHubRateepmf7")
        : translate("uxRecipestudio.crawlingGitHubSourceqd20u");
    const showProgress = typeof source.percent === "number";

    return (
      <div className="rounded-xl border border-border/60 bg-card/55 p-4 shadow-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/20"
            >
              {showProgress ? (
                <HugeiconsIcon icon={GithubIcon} className="size-4 text-muted-foreground" />
              ) : (
                <Spinner className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">
                {formatGitHubSourceMessage(execution)}
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onOpenOverview}>
            {translate("uxRecipestudio.openOverview8b0qp")}
          </Button>
        </div>
        {showProgress && <Progress value={source.percent ?? 0} className="mt-3 h-1" />}
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Repo</span>
            <span className="truncate font-semibold">{source.repo ?? "--"}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Resource</span>
            <span className="font-semibold">
              {formatSourceResource(source.resource)}
              {typeof source.page === "number" ? ` page ${source.page}` : ""}
            </span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Fetched</span>
            <span className="font-semibold">{formatFetchedValue(execution)}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{translate("uxRecipestudio.rateRemainingn8hel")}</span>
            <span className="font-semibold">{formatMetricValue(source.rate_remaining)}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{translate("uxRecipestudio.retryWaitam3p0")}</span>
            <span className="font-semibold">
              {typeof source.retry_after_sec === "number"
                ? `${formatMetricValue(source.retry_after_sec)}s`
                : "--"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/55 p-4 text-center shadow-border">
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <Spinner className="size-5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{translate("uxRecipestudio.generatingDatacns2t")}</p>
          <p className="text-xs text-muted-foreground">
            {execution.current_column
              ? `Current column: ${execution.current_column}`
              : translate("uxRecipestudio.rowsWillAppearHereffhkc")}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onOpenOverview}>
          {translate("uxRecipestudio.openOverview8b0qp")}
        </Button>
      </div>
    </div>
  );
}

type ExecutionDataTabProps = {
  execution: RecipeExecutionRecord;
  datasetColumnNames: string[];
  hiddenDatasetColumns: string[];
  canPageDataset: boolean;
  currentDatasetPage: number;
  totalPages: number;
  tableColumns: ColumnDef<Record<string, unknown>>[];
  datasetRowsForTable: Record<string, unknown>[];
  onOpenOverview: () => void;
  onSetHiddenColumns: (updater: (current: string[]) => string[]) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function ExecutionDataTab({
  execution,
  datasetColumnNames,
  hiddenDatasetColumns,
  canPageDataset,
  currentDatasetPage,
  totalPages,
  tableColumns,
  datasetRowsForTable,
  onOpenOverview,
  onSetHiddenColumns,
  onPrevPage,
  onNextPage,
}: ExecutionDataTabProps): ReactElement {
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">{translate("uxRecipestudio.datasetSampleakuru")}</p>
          {isExecutionInProgress(execution.status) && execution.dataset.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {translate("uxRecipestudio.livePreviewNewRows972ng")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {datasetColumnNames.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  {translate("studio.dataset.columns")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{translate("uxRecipestudio.visibleColumns1yop6")}</DropdownMenuLabel>
                {datasetColumnNames.map((columnName) => (
                  <DropdownMenuCheckboxItem
                    key={columnName}
                    checked={!hiddenDatasetColumns.includes(columnName)}
                    onSelect={(event) => {
                      event.preventDefault();
                    }}
                    onCheckedChange={(checked) => {
                      onSetHiddenColumns((currentColumns) => {
                        if (checked) {
                          return currentColumns.filter((name) => name !== columnName);
                        }
                        return [...currentColumns, columnName];
                      });
                    }}
                  >
                    {columnName}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canPageDataset && (
            <>
              <span>{translate("uxRecipestudio.page7775p", { p1: currentDatasetPage, p2: totalPages })}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  isExecutionInProgress(execution.status) || currentDatasetPage <= 1
                }
                onClick={onPrevPage}
              >
                Prev
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  isExecutionInProgress(execution.status) ||
                  currentDatasetPage >= totalPages
                }
                onClick={onNextPage}
              >
                Next
              </Button>
            </>
          )}
        </div>
      </div>
      {execution.dataset.length === 0 ? (
        isExecutionInProgress(execution.status) ? (
          <RunningDatasetEmptyState
            execution={execution}
            onOpenOverview={onOpenOverview}
          />
        ) : (
          <p className="text-xs text-muted-foreground">{translate("uxRecipestudio.noRowsReturnedla9ss")}</p>
        )
      ) : tableColumns.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {translate("uxRecipestudio.allColumnsHiddenUse2wfaf")}
        </p>
      ) : (
        <div className="max-h-[55vh] overflow-auto">
          <DataTable columns={tableColumns} data={datasetRowsForTable} />
        </div>
      )}
    </div>
  );
}
