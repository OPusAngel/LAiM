// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GithubIcon, PlayCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { LocalRecipeModelSelector } from "../dialogs/models/local-recipe-model-selector";
import { GithubRepoSeedForm } from "../dialogs/seed/seed-dialog";
import { FieldLabel } from "../dialogs/shared/field-label";
import type { ModelConfig, NodeConfig, SeedConfig } from "../types";

type GithubCrawlerEasyViewProps = {
  configs: Record<string, NodeConfig>;
  rows: number;
  setRows: (rows: number) => void;
  updateConfig: (id: string, patch: Partial<NodeConfig>) => void;
  onRun: () => void;
  runLoading: boolean;
  runErrors: string[];
  onSwitchToAdvanced: () => void;
};

export function GithubCrawlerEasyView({
  configs,
  rows,
  setRows,
  updateConfig,
  onRun,
  runLoading,
  runErrors,
  onSwitchToAdvanced,
}: GithubCrawlerEasyViewProps): ReactElement {
  const seedConfig = useMemo(
    () =>
      Object.values(configs).find((c): c is SeedConfig => c.kind === "seed") ??
      null,
    [configs],
  );
  const modelConfig = useMemo(
    () =>
      Object.values(configs).find(
        (c): c is ModelConfig => c.kind === "model_config",
      ) ?? null,
    [configs],
  );
  const localProviderNames = useMemo(() => {
    const names = new Set<string>();
    for (const config of Object.values(configs)) {
      if (config.kind === "model_provider" && config.is_local === true) {
        names.add(config.name);
      }
    }
    return names;
  }, [configs]);
  const isModelLinkedToLocal = modelConfig
    ? localProviderNames.has(modelConfig.provider)
    : false;
  const modelValue = modelConfig?.model ?? "";
  const localModelValue =
    modelValue.trim().toLowerCase() === "local" ? "" : modelValue;

  // Local buffer for the Rows input so the user can hold transient invalid state (empty while
  // backspacing, partial digits, etc.) without the parent snapping them back to 1 on every
  // keystroke. The canonical ``rows`` value only advances when the buffer parses to a valid
  // positive integer; on blur we clamp back to a sane default if the user left it empty.
  const [rowsText, setRowsText] = useState(String(rows));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the draft input in sync when the parent resets rows.
    setRowsText(String(rows));
  }, [rows]);

  const handleSeedUpdate = (patch: Partial<SeedConfig>): void => {
    if (!seedConfig) {
      return;
    }
    updateConfig(seedConfig.id, patch);
  };

  const handleModelChange = (value: string): void => {
    if (!modelConfig) {
      return;
    }
    updateConfig(modelConfig.id, {
      model: value,
      // biome-ignore lint/style/useNamingConvention: api schema
      gguf_variant: undefined,
    });
  };

  const handleLocalModelChange = (
    model: string,
    variant?: string | null,
  ): void => {
    if (!modelConfig) {
      return;
    }
    updateConfig(modelConfig.id, {
      model,
      // biome-ignore lint/style/useNamingConvention: api schema
      gguf_variant: variant ?? undefined,
    });
  };

  if (!seedConfig) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">{translate("uxRecipestudio.thisRecipeHasNoovi6i", { p1: " " })}<button
            type="button"
            className="underline hover:text-foreground"
            onClick={onSwitchToAdvanced}
          >
            Advanced
          </button>{translate("uxRecipestudio.toConfigureItjqi15", { p1: " " })}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto px-6 py-6">
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg corner-squircle border border-border/70 bg-muted/20"
          aria-hidden={true}
        >
          <HugeiconsIcon icon={GithubIcon} className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold">{translate("uxRecipestudio.gitHubCrawlers3mm0")}</h2>
          <p className="text-xs text-muted-foreground">{translate("uxRecipestudio.crawlRealGitHubIssuespbzr1", { p1: " " })}<code>{"{User, Assistant}"}</code>{translate("uxRecipestudio.trainingPairDefaultsUsem07rd")}<code>GH_TOKEN</code> env var and the bundled local model.
          </p>
        </div>
      </div>

      <GithubRepoSeedForm config={seedConfig} onUpdate={handleSeedUpdate} />

      <section className="space-y-3 border-t border-border/60 pt-4">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          {translate("uxModelpicker.runSettingsmw4kg")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("uxRecipestudio.rowsToGenerateio7mr")}
              hint={translate("uxRecipestudio.howManyTrainingPairsp2jef")}
            />
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="nodrag"
              value={rowsText}
              onChange={(event) => {
                // Allow empty / partial strings while the user is editing.
                // type="text" avoids the browser's number spinner and the
                // related backspace quirks; we still parse + clamp below.
                const raw = event.target.value.replace(/[^0-9]/g, "");
                setRowsText(raw);
                const next = Number.parseInt(raw, 10);
                if (Number.isFinite(next) && next > 0 && next <= 10000) {
                  setRows(next);
                }
              }}
              onBlur={() => {
                const next = Number.parseInt(rowsText, 10);
                if (!Number.isFinite(next) || next < 1) {
                  setRows(1);
                  setRowsText("1");
                } else if (next > 10000) {
                  setRows(10000);
                  setRowsText("10000");
                } else {
                  setRowsText(String(next));
                }
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel
              label={translate("settings.voice.dictation.customModelLabel")}
              hint={
                isModelLinkedToLocal
                  ? translate("uxRecipestudio.chooseTheLocalModel3p2h4")
                  : translate("uxRecipestudio.openAICompatibleModelIdppth4")
              }
            />
            {isModelLinkedToLocal ? (
              <LocalRecipeModelSelector
                value={localModelValue}
                ggufVariant={modelConfig?.gguf_variant}
                onChange={handleLocalModelChange}
                disabled={!modelConfig}
              />
            ) : (
              <Input
                className="nodrag font-mono text-xs"
                value={modelValue}
                onChange={(event) => handleModelChange(event.target.value)}
                placeholder={translate("uxRecipestudio.unslothGemma4E2Bjo31m")}
                disabled={!modelConfig}
              />
            )}
          </div>
        </div>
      </section>

      {runErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <p className="font-semibold">{translate("uxRecipestudio.cannotRunf5zme")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {runErrors.slice(0, 4).map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          className="text-xs text-muted-foreground underline hover:text-foreground"
          onClick={onSwitchToAdvanced}
        >
          {translate("uxCopy.advancedDragAndDrop29csh")}
        </button>
        <Button type="button" size="lg" onClick={onRun} disabled={runLoading}>
          <HugeiconsIcon icon={PlayCircleIcon} className="size-4" />
          {runLoading ? "Running..." : "Run"}
        </Button>
      </div>
    </div>
  );
}
