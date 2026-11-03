// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/features/chat";
import { PillTabs } from "@/features/model-picker/components/model-selector/pill-tabs";
import { ChevronDownStandardIcon } from "@/lib/chevron-icons";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import {
  CHATTERBOX_CONVERT_GUIDANCE_RANGE,
  CHATTERBOX_CONVERT_STEPS_RANGE,
  type ChatterboxConvertValue,
  type RvcValue,
  SEED_VC_ENGINES,
  SEED_VC_GUIDANCE_RANGE,
  SEED_VC_LENGTH_RANGE,
  SEED_VC_STEPS_RANGE,
  type SeedVcEngine,
  type SeedVcValue,
  type Vevo2StyleValue,
  chatterboxConvertLogic,
  rvcLogic,
  seedVcLogic,
  seedVcRoute,
  vevo2StyleLogic,
} from "./convert-panel-logic";
import type { AudioToolPanel } from "./types";

function PanelSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="grid gap-0.5">
        <h3 className="text-ui-13 font-medium text-foreground">{title}</h3>
        {hint ? (
          <p className="text-ui-11p5 leading-snug text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MoreSettings({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex w-fit items-center gap-1 rounded-full text-ui-11p5 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >{translate("uxAudio.moreSettingsydtaz")}<HugeiconsIcon
          icon={ChevronDownStandardIcon}
          className={cn(
            "size-3 transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? children : null}
    </div>
  );
}

export const seedVcPanel: AudioToolPanel<SeedVcValue> = {
  ...seedVcLogic,
  Component: ({ value, onChange, disabled, ctx }) => {
    const singing = ctx.convertMode === "singing";
    const v2 = seedVcRoute(value, ctx) === "v2_vc";
    return (
      <PanelSection
        title="Seed-VC"
        hint={singing ? translate("uxAudio.singingUsesTheV1qm1i8") : undefined}
      >
        {singing ? null : (
          <div className="grid gap-1.5">
            <label
              htmlFor="convert-seed-vc-engine"
              className="text-ui-13 font-medium text-foreground"
            >
              Engine
            </label>
            <Select
              value={value.engine}
              onValueChange={(engine) =>
                onChange({ ...value, engine: engine as SeedVcEngine })
              }
              disabled={disabled}
            >
              <SelectTrigger
                id="convert-seed-vc-engine"
                size="sm"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEED_VC_ENGINES.map((engine) => (
                  <SelectItem key={engine.value} value={engine.value}>
                    {engine.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {v2 ? (
          <>
            <ParamSlider
              label={translate("uxAudio.soundLikeTheTarget1szx7")}
              value={value.similarity}
              min={SEED_VC_GUIDANCE_RANGE.min}
              max={SEED_VC_GUIDANCE_RANGE.max}
              step={0.05}
              disabled={disabled}
              info={translate("uxAudio.higherFollowsTheTargetlhgzt")}
              onChange={(similarity) => onChange({ ...value, similarity })}
            />
            <ParamSlider
              label={translate("uxAudio.keepWordsClear1eayf")}
              value={value.intelligibility}
              min={SEED_VC_GUIDANCE_RANGE.min}
              max={SEED_VC_GUIDANCE_RANGE.max}
              step={0.05}
              disabled={disabled}
              info={translate("uxAudio.higherKeepsTheWordskxy5b")}
              onChange={(intelligibility) =>
                onChange({ ...value, intelligibility })
              }
            />
          </>
        ) : (
          <ParamSlider
            label={translate("uxVideo.guidancew7efa")}
            value={value.guidance}
            min={SEED_VC_GUIDANCE_RANGE.min}
            max={SEED_VC_GUIDANCE_RANGE.max}
            step={0.05}
            disabled={disabled}
            info={translate("uxAudio.howStronglyTheOutputjlj6o")}
            onChange={(guidance) => onChange({ ...value, guidance })}
          />
        )}
        <MoreSettings
          open={value.more === true}
          onOpenChange={(more) => onChange({ ...value, more })}
        >
          <ParamSlider
            label={translate("studio.preview.length")}
            value={value.length}
            min={SEED_VC_LENGTH_RANGE.min}
            max={SEED_VC_LENGTH_RANGE.max}
            step={0.05}
            disabled={disabled}
            format={(v) => `${v.toFixed(2)}×`}
            info={translate("uxAudio.below1SpeedsTher1x8i")}
            onChange={(length) => onChange({ ...value, length })}
          />
          <ParamSlider
            label={translate("settings.profile.stats.trainingSteps")}
            value={value.steps}
            min={SEED_VC_STEPS_RANGE.min}
            max={SEED_VC_STEPS_RANGE.max}
            step={1}
            disabled={disabled}
            info={translate("uxAudio.moreStepsCanSoundoddwa")}
            onChange={(steps) => onChange({ ...value, steps })}
          />
          {v2 ? (
            <div className="grid gap-1.5">
              <label
                htmlFor="convert-seed-vc-anonymize"
                className="flex items-center justify-between gap-3 text-ui-13 font-medium text-foreground"
              >
                Anonymize
                <Switch
                  id="convert-seed-vc-anonymize"
                  checked={value.anonymize}
                  disabled={disabled}
                  onCheckedChange={(anonymize) =>
                    onChange({ ...value, anonymize })
                  }
                />
              </label>
              <p className="text-ui-11p5 leading-snug text-muted-foreground">
                {translate("uxAudio.makesTheVoiceHard1jo3u")}
              </p>
            </div>
          ) : null}
        </MoreSettings>
      </PanelSection>
    );
  },
};

export const rvcPanel: AudioToolPanel<RvcValue> = {
  ...rvcLogic,
  Component: ({ value, onChange, disabled }) => (
    <PanelSection title="RVC">
      <ParamSlider
        label={translate("uxAudio.indexBlendpobol")}
        value={value.blend}
        min={0}
        max={1}
        step={0.05}
        disabled={disabled}
        info={translate("uxAudio.higherBringsInMorewr6y6")}
        onChange={(blend) => onChange({ ...value, blend })}
      />
      <ParamSlider
        label={translate("uxAudio.protectConsonants188ms")}
        value={value.protect}
        min={0}
        max={0.5}
        step={0.01}
        disabled={disabled}
        info={translate("uxAudio.keepsBreathsAndSoftedxy5")}
        onChange={(protect) => onChange({ ...value, protect })}
      />
      <ParamSlider
        label={translate("uxAudio.volumeEnvelopeMix1k2jh")}
        value={value.rms}
        min={0}
        max={1}
        step={0.05}
        disabled={disabled}
        info={translate("uxAudio.0KeepsTheRecordingerj7j")}
        onChange={(rms) => onChange({ ...value, rms })}
      />
    </PanelSection>
  ),
};

export const chatterboxConvertPanel: AudioToolPanel<ChatterboxConvertValue> = {
  ...chatterboxConvertLogic,
  Component: ({ value, onChange, disabled }) => (
    <PanelSection title="Chatterbox">
      <ParamSlider
        label={translate("uxVideo.guidancew7efa")}
        value={value.guidance}
        min={CHATTERBOX_CONVERT_GUIDANCE_RANGE.min}
        max={CHATTERBOX_CONVERT_GUIDANCE_RANGE.max}
        step={0.05}
        disabled={disabled}
        info={translate("uxAudio.howStronglyTheOutputjlj6o")}
        onChange={(guidance) => onChange({ ...value, guidance })}
      />
      <MoreSettings
        open={value.more === true}
        onOpenChange={(more) => onChange({ ...value, more })}
      >
        <ParamSlider
          label={translate("settings.profile.stats.trainingSteps")}
          value={value.steps}
          min={CHATTERBOX_CONVERT_STEPS_RANGE.min}
          max={CHATTERBOX_CONVERT_STEPS_RANGE.max}
          step={1}
          disabled={disabled}
          info={translate("uxAudio.moreStepsCanSoundoddwa")}
          onChange={(steps) => onChange({ ...value, steps })}
        />
      </MoreSettings>
    </PanelSection>
  ),
};

// ---- Vevo2 -----------------------------------------------------------------------------------

const VEVO2_HINTS = {
  get singing() { return translate("uxAudio.singingKeepsTheRecordingjp7t8"); },
  get target() { return translate("uxAudio.takesTheTargetS1k591"); },
  get source() { return translate("uxAudio.changesOnlyTheVoicekvk0g"); },
} as const;

export const vevo2StylePanel: AudioToolPanel<Vevo2StyleValue> = {
  ...vevo2StyleLogic,
  Component: ({ value, onChange, disabled, ctx }) => (
    <PanelSection
      title="Vevo2"
      hint={
        VEVO2_HINTS[ctx.convertMode === "singing" ? "singing" : value.style]
      }
    >
      {ctx.convertMode === "singing" ? null : (
        <PillTabs
          ariaLabel="Style"
          value={value.style}
          onValueChange={(style) =>
            onChange({ style: style === "target" ? "target" : "source" })
          }
          disabled={disabled}
          fit={true}
          compact={true}
          className="[&>button]:px-3"
          tabs={[
            { value: "source", label: translate("uxAudio.keepSourceStyle142pb") },
            { value: "target", label: translate("uxAudio.takeTargetStylef447b") },
          ]}
        />
      )}
    </PanelSection>
  ),
};

export const CONVERT_TOOL_PANELS = [
  seedVcPanel,
  rvcPanel,
  chatterboxConvertPanel,
  vevo2StylePanel,
] as const;
