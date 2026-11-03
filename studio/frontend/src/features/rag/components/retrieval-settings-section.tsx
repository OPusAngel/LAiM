// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { InfoHint } from "@/components/ui/info-hint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type RagAutoInject,
  type RagMode,
  useChatRuntimeStore,
} from "@/features/chat/stores/chat-runtime-store";
import { ChevronDownStandardIcon } from "@/lib/chevron-icons";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<RagMode, string> = {
  hybrid: "Hybrid",
  get dense() { return translate("uxRag.semanticOnlyhor7p"); },
  lexical: "BM25 only",
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  format = (v: number) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  format?: (v: number) => string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex min-h-8 items-center justify-between">
        <span className="text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
          {label}
        </span>
        <span className="text-ui-13 tabular-nums text-muted-foreground">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
        className="panel-slider"
      />
    </div>
  );
}

// Retrieval settings; the source itself is picked from the composer dropdown.
export function RetrievalSettingsSection() {
  const ragMode = useChatRuntimeStore((s) => s.ragMode);
  const setRagMode = useChatRuntimeStore((s) => s.setRagMode);
  const ragTopK = useChatRuntimeStore((s) => s.ragTopK);
  const setRagTopK = useChatRuntimeStore((s) => s.setRagTopK);
  const ragAutoInject = useChatRuntimeStore((s) => s.ragAutoInject);
  const setRagAutoInject = useChatRuntimeStore((s) => s.setRagAutoInject);
  const ragAutoInjectMinScore = useChatRuntimeStore(
    (s) => s.ragAutoInjectMinScore,
  );
  const setRagAutoInjectMinScore = useChatRuntimeStore(
    (s) => s.setRagAutoInjectMinScore,
  );
  const ragOcrScanned = useChatRuntimeStore((s) => s.ragOcrScanned);
  const setRagOcrScanned = useChatRuntimeStore((s) => s.setRagOcrScanned);
  const ragCaptionFigures = useChatRuntimeStore((s) => s.ragCaptionFigures);
  const setRagCaptionFigures = useChatRuntimeStore(
    (s) => s.setRagCaptionFigures,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
          {translate("uxRag.searchModesqd81")}
        </span>
        <Select
          value={ragMode}
          onValueChange={(value) => setRagMode(value as RagMode)}
        >
          <SelectTrigger
            icon={ChevronDownStandardIcon}
            iconClassName="size-3.5"
            className="panel-select-trigger w-full"
            aria-label={translate("uxRag.searchModesqd81")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hybrid">{MODE_LABEL.hybrid}</SelectItem>
            <SelectItem value="dense">{MODE_LABEL.dense}</SelectItem>
            <SelectItem value="lexical">{MODE_LABEL.lexical}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex min-h-8 items-center justify-between">
          <span className="text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
            {translate("uxRag.passagesTopKlrd4q")}
          </span>
          <span className="text-ui-13 tabular-nums text-muted-foreground">
            {ragTopK}
          </span>
        </div>
        <Slider
          value={[ragTopK]}
          min={1}
          max={20}
          step={1}
          onValueChange={([value]) => setRagTopK(value)}
          aria-label={translate("uxRag.numberOfPassagesTotzz0v")}
          className="panel-slider"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
            {translate("uxRag.autoRetrieveDocumentsh0yj3")}
            <InfoHint>
              {translate("uxCopy.autoTurnsRetrievalOn1ba0u")}
            </InfoHint>
          </span>
          <span className="text-ui-12 leading-[1.3] text-muted-foreground">
            {translate("uxRag.searchAttachedDocumentsBefore1i874")}
          </span>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={ragAutoInject}
          onValueChange={(value) => {
            // Radix clears on re-click; ignore empty so one stays selected.
            if (value) {
              setRagAutoInject(value as RagAutoInject);
            }
          }}
          className="w-full"
          aria-label={translate("uxRag.autoRetrieveDocumentsh0yj3")}
        >
          <ToggleGroupItem value="auto" className="flex-1">
            {translate("settings.appearance.custom.sentAttachments.auto")}
          </ToggleGroupItem>
          <ToggleGroupItem value="on" className="flex-1">
            On
          </ToggleGroupItem>
          <ToggleGroupItem value="off" className="flex-1">
            Off
          </ToggleGroupItem>
        </ToggleGroup>
        <SliderRow
          label={translate("uxRag.autoRetrieveThreshold42oem")}
          value={ragAutoInjectMinScore}
          min={0}
          max={1}
          step={0.05}
          disabled={ragAutoInject === "off"}
          onChange={setRagAutoInjectMinScore}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
            {translate("uxRag.oCRScannedPagess4p9e")}
            <InfoHint>
              {translate("uxCopy.readScannedOrImage1wyr7")}
            </InfoHint>
          </span>
          <span className="text-ui-12 leading-[1.3] text-muted-foreground">
            {translate("uxRag.transcribeImageOnlyPDF1tvsh")}
          </span>
        </div>
        <Switch
          checked={ragOcrScanned}
          onCheckedChange={setRagOcrScanned}
          aria-label={translate("uxRag.oCRScannedPagess4p9e")}
          className="panel-switch mt-0.5"
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 text-ui-13 font-medium leading-[1.25] tracking-nav text-nav-fg">
            {translate("uxRag.describeFiguresAmpChartsfmuu7")}
            <InfoHint>{translate("uxRag.captionPDFFiguresChartshgn3g")}</InfoHint>
          </span>
          <span className="text-ui-12 leading-[1.3] text-muted-foreground">
            {translate("uxRag.optionalVisionPassCan15osn")}
          </span>
        </div>
        <Switch
          checked={ragCaptionFigures}
          onCheckedChange={setRagCaptionFigures}
          aria-label={translate("uxRag.describeFiguresAndCharts1dyb6")}
          className="panel-switch mt-0.5"
        />
      </div>
    </div>
  );
}
