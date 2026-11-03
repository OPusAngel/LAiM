// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { PillTabs } from "@/features/model-picker/components/model-selector/pill-tabs";
import { formatVibeVoiceScript } from "../clone-policy";
import { VoicePicker } from "../components/voice-picker";
import {
  type SpeakVoiceValue,
  speakVoiceLogic,
  vibeVoiceDialogueLogic,
} from "./panel-logic";
import type { AudioToolPanel } from "./types";

const speakVoicePanel: AudioToolPanel<SpeakVoiceValue> = {
  ...speakVoiceLogic,
  Component: ({ value, onChange, disabled }) => (
    <div className="grid gap-2">
      <span className="text-ui-13 font-medium text-foreground">Voice</span>
      <PillTabs
        ariaLabel="Voice"
        value={value.source}
        onValueChange={(source) =>
          onChange({
            ...value,
            source: source === "saved" ? "saved" : "builtin",
          })
        }
        disabled={disabled}
        fit={true}
        compact={true}
        className="[&>button]:px-3"
        tabs={[
          { value: "builtin", label: translate("settings.appearance.custom.fontBundledGroup") },
          { value: "saved", label: translate("picker.hfToken.saved") },
        ]}
      />
      {value.source === "saved" ? (
        <VoicePicker
          selectedId={value.voiceId}
          disabled={disabled}
          onSelect={(voice) => onChange({ ...value, voiceId: voice.id })}
          onDeselect={() => onChange({ ...value, voiceId: null })}
        />
      ) : (
        <p className="text-ui-11p5 leading-snug text-muted-foreground">
          {translate("uxCopy.theModelSOwn11bf3")}
        </p>
      )}
    </div>
  ),
};

const vibeVoiceDialoguePanel: AudioToolPanel<null> = {
  ...vibeVoiceDialogueLogic,
  Component: ({ core }) => {
    const text = core?.text.trim() ?? "";
    const script = formatVibeVoiceScript(text);
    return (
      <div className="grid gap-1.5">
        <span className="text-ui-13 font-medium text-foreground">Dialogue</span>
        <p className="text-ui-11p5 leading-snug text-muted-foreground">{translate("uxAudio.thisModelReadsAgae5w")}</p>
        {text && script !== text ? (
          <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded-xl bg-muted px-3 py-2 font-mono text-ui-11p5 text-muted-foreground">
            {script}
          </pre>
        ) : null}
      </div>
    );
  },
};

export const SPEAK_TOOL_PANELS = [
  speakVoicePanel,
  vibeVoiceDialoguePanel,
] as const;
