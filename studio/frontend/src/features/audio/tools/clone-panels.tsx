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
import { Textarea } from "@/components/ui/textarea";
import { ParamSlider } from "@/features/chat";
import { PillTabs } from "@/features/model-picker/components/model-selector/pill-tabs";
import type { ReactNode } from "react";
import { INDEX_TTS2_EMOTIONS } from "../clone-policy";
import { AudioSourceInput } from "../components/audio-source-input";
import { Field } from "../components/field";
import {
  type CosyVoiceMode,
  type CosyVoiceModeValue,
  type EmotionMode,
  type EmotionValue,
  type ExpressivenessValue,
  F5_DIALECTS,
  type SpeedDialectValue,
  type TimbreOnlyValue,
  chatterboxExpressivenessLogic,
  cosyVoiceModeLogic,
  emotionSourceProblem,
  f5SpeedDialectLogic,
  indexTts2EmotionLogic,
  qwen3TimbreLogic,
} from "./panel-logic";
import type { AudioToolPanel } from "./types";

export function PanelSection({
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

const qwen3TimbrePanel: AudioToolPanel<TimbreOnlyValue> = {
  ...qwen3TimbreLogic,
  Component: ({ value, onChange, disabled }) => (
    <div className="grid gap-1.5">
      <label
        htmlFor="clone-timbre-only"
        className="flex items-center justify-between gap-3 text-ui-13 font-medium text-foreground"
      >{translate("uxAudio.timbreOnly6txnl")}<Switch
          id="clone-timbre-only"
          checked={value.timbreOnly}
          disabled={disabled}
          onCheckedChange={(timbreOnly) => onChange({ timbreOnly })}
        />
      </label>
      <p className="text-ui-11p5 leading-snug text-muted-foreground">
        {translate("uxCopy.copiesTheSoundOfz9cow")}
      </p>
    </div>
  ),
};

const indexTts2EmotionPanel: AudioToolPanel<EmotionValue> = {
  ...indexTts2EmotionLogic,
  Component: ({ value, onChange, disabled }) => (
    <PanelSection
      title={translate("uxAudio.emotionru67m")}
      hint={translate("uxAudio.optionalLeaveItEmpty1bhga")}
    >
      <PillTabs
        ariaLabel={translate("uxAudio.emotionSourceer2xk")}
        value={value.mode}
        onValueChange={(mode) =>
          onChange({ ...value, mode: mode as EmotionMode })
        }
        disabled={disabled}
        fit={true}
        compact={true}
        className="[&>button]:px-3"
        tabs={[
          { value: "text", label: translate("uxAudio.fromText1qsrk") },
          { value: "audio", label: translate("uxAudio.fromAudioiu4wx") },
          { value: "mixer", label: translate("uxAudio.mixer1lm9f") },
        ]}
      />
      {value.mode === "text" ? (
        <Field
          label={translate("uxAudio.describeTheEmotionz6eyk")}
          htmlFor="clone-emotion-text"
          hint={translate("uxFeatures.aFewWordsSuch1qlhd")}
        >
          <Textarea
            id="clone-emotion-text"
            value={value.text}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, text: event.target.value })
            }
            className="min-h-16"
          />
        </Field>
      ) : value.mode === "audio" ? (
        <AudioSourceInput
          id="clone-emotion-audio"
          label={translate("uxAudio.emotionClip1gi97")}
          hint={translate("uxAudio.itsMoodIsCopied1xnqn")}
          value={value.source}
          onChange={(source) => onChange({ ...value, source })}
          onStatusChange={(status) => {
            const sourceProblem = emotionSourceProblem(status);
            if (sourceProblem !== (value.sourceProblem ?? null)) {
              onChange({ ...value, sourceProblem });
            }
          }}
          disabled={disabled}
          allowSavedVoice={false}
        />
      ) : (
        <div className="grid gap-2">
          {INDEX_TTS2_EMOTIONS.map((emotion, index) => (
            <ParamSlider
              key={emotion.key}
              label={emotion.label}
              value={value.vector[index] ?? 0}
              min={0}
              max={1}
              step={0.05}
              disabled={disabled}
              inline={true}
              onChange={(next) => {
                const vector = INDEX_TTS2_EMOTIONS.map((_, i) =>
                  i === index ? next : (value.vector[i] ?? 0),
                );
                onChange({ ...value, vector });
              }}
            />
          ))}
        </div>
      )}
      <ParamSlider
        label={translate("uxImages.strength1okjn")}
        value={value.alpha}
        min={0}
        max={1}
        step={0.05}
        disabled={disabled}
        info={translate("uxAudio.howStronglyTheEmotionbfl6t")}
        onChange={(alpha) => onChange({ ...value, alpha })}
      />
    </PanelSection>
  ),
};

const chatterboxExpressivenessPanel: AudioToolPanel<ExpressivenessValue> = {
  ...chatterboxExpressivenessLogic,
  Component: ({ value, onChange, disabled }) => (
    <PanelSection
      title={translate("uxAudio.expressiveness1f34j")}
      hint={translate("uxAudio.theFirstRunWith1vja8")}
    >
      <ParamSlider
        label={translate("uxAudio.intensityn84ia")}
        value={value.exaggeration}
        min={0}
        max={2}
        step={0.05}
        disabled={disabled}
        info={translate("uxAudio.higherIsMoreDramaticmbltn")}
        onChange={(exaggeration) => onChange({ ...value, exaggeration })}
      />
      <ParamSlider
        label={translate("uxVideo.guidancew7efa")}
        value={value.guidance}
        min={0}
        max={5}
        step={0.05}
        disabled={disabled}
        info={translate("uxAudio.howCloselyTheDeliveryk71mn")}
        onChange={(guidance) => onChange({ ...value, guidance })}
      />
    </PanelSection>
  ),
};

const cosyVoiceModePanel: AudioToolPanel<CosyVoiceModeValue> = {
  ...cosyVoiceModeLogic,
  Component: ({ value, onChange, disabled }) => (
    <PanelSection
      title={translate("settings.debugging.mode")}
      hint={
        value.mode === "zero_shot"
          ? translate("uxAudio.sameLanguageSpeaksInjjnxg")
          : value.mode === "cross_lingual"
            ? translate("uxAudio.crossLingualSpeaksAnotherwnpv5")
            : translate("uxAudio.instructSameVoice92p38")
      }
    >
      <PillTabs
        ariaLabel="Mode"
        value={value.mode}
        onValueChange={(mode) =>
          onChange({ ...value, mode: mode as CosyVoiceMode })
        }
        disabled={disabled}
        fit={true}
        compact={true}
        className="[&>button]:px-3"
        tabs={[
          { value: "zero_shot", label: translate("uxAudio.sameLanguage1cimd") },
          { value: "cross_lingual", label: translate("uxAudio.crossLingualxunyj") },
          { value: "instruct", label: translate("uxAudio.instruct8edmz") },
        ]}
      />
      {value.mode === "instruct" ? (
        <Field label={translate("uxAudio.instructionusqry")} htmlFor="clone-instruction">
          <Textarea
            id="clone-instruction"
            value={value.instruction}
            disabled={disabled}
            placeholder={translate("uxAudio.speakSlowlyInA7pwd2")}
            onChange={(event) =>
              onChange({ ...value, instruction: event.target.value })
            }
            className="min-h-16"
          />
        </Field>
      ) : null}
    </PanelSection>
  ),
};

const f5SpeedDialectPanel: AudioToolPanel<SpeedDialectValue> = {
  ...f5SpeedDialectLogic,
  Component: ({ value, onChange, disabled, specs }) => (
    <PanelSection title={translate("uxAudio.speedAndDialect1bemh")}>
      <ParamSlider
        label={translate("settings.voice.readAloud.speedLabel")}
        value={value.speed}
        min={0.5}
        max={2}
        step={0.05}
        disabled={disabled}
        format={(v) => `${v.toFixed(2)}×`}
        onChange={(speed) => onChange({ ...value, speed })}
      />
      {specs.some((spec) => spec.name === "dialect") ? (
        <div className="grid gap-1.5">
          <label
            htmlFor="clone-dialect"
            className="text-ui-13 font-medium text-foreground"
          >
            Dialect
          </label>
          <Select
            value={value.dialect}
            onValueChange={(dialect) => onChange({ ...value, dialect })}
            disabled={disabled}
          >
            <SelectTrigger id="clone-dialect" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {F5_DIALECTS.map((dialect) => (
                <SelectItem key={dialect.value} value={dialect.value}>
                  {dialect.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </PanelSection>
  ),
};

export const CLONE_TOOL_PANELS = [
  qwen3TimbrePanel,
  indexTts2EmotionPanel,
  chatterboxExpressivenessPanel,
  cosyVoiceModePanel,
  f5SpeedDialectPanel,
] as const;
