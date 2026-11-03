// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CheckmarkCircle01Icon,
  InformationCircleIcon,
  LayersIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { QUANT_OPTIONS } from "../constants";

interface QuantPickerProps {
  value: string[];
  onChange: (v: string[]) => void;
  /** quant value -> "~X GB"; blank/missing when the model size is unknown. */
  sizes?: Record<string, string>;
  /** Choices to offer; defaults to every GGUF quant. */
  options?: { value: string; label: string; recommended?: boolean }[];
}

export function QuantPicker({
  value,
  onChange,
  sizes,
  options = QUANT_OPTIONS,
}: QuantPickerProps) {
  const toggle = (qv: string) => {
    onChange(
      value.includes(qv) ? value.filter((q) => q !== qv) : [...value, qv],
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={LayersIcon}
          className="size-4 text-muted-foreground"
        />
        <span className="text-xs font-medium text-muted-foreground">
          {translate("uxExport.quantizationLevels14v05")}
        </span>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <button
              type="button"
              className="text-foreground/70 hover:text-foreground"
            >
              <HugeiconsIcon icon={InformationCircleIcon} className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{translate("uxExport.lowerQuantizationQ2Q3hr6yl", { p1: " " })}<a
              href="https://LAiM.ai/docs/basics/inference-and-deployment/saving-to-gguf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >{translate("uxExport.readMoreivesk")}</a>
          </TooltipContent>
        </Tooltip>
        <span className="text-ui-11 text-muted-foreground/70">{translate("uxExport.selectOneOrMoreiqprk")}</span>
      </div>
      <div className="flex flex-wrap gap-2 py-1 pl-1">
        {options.map((q) => {
          const active = value.includes(q.value);
          const sizeLabel = sizes?.[q.value] ?? "";
          return (
            <button
              key={q.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(q.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                active
                  ? "ring-ring-strong bg-primary/10 text-foreground"
                  : "ring-border text-muted-foreground hover:text-foreground hover:ring-[color-mix(in_oklab,var(--foreground)_calc(20%*var(--contrast-edge-gain,1)),transparent)]",
              )}
            >
              {active && (
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  className="size-3 text-primary"
                />
              )}
              {q.label}
              {sizeLabel && (
                <span className="text-ui-10 opacity-60">{sizeLabel}</span>
              )}
              {q.recommended && !active && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0 text-ui-9 font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  rec
                </span>
              )}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-ui-11 text-muted-foreground">{translate("uxExport.selectedd5zkt", { p1: value.length })}</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-ui-11 text-muted-foreground/70 hover:text-foreground transition-colors"
          >{translate("uxExport.clearAllyye4n")}</button>
        </div>
      )}
    </div>
  );
}
