// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NativeAudioInstructionsKind } from "../audio-page-policy";
import { Field } from "./field";

export function InstructionsField({
  instructionsKind,
  musicNeedsDescription,
  voiceRequired = false,
  audioInstructions,
  setAudioInstructions,
}: {
  instructionsKind: NativeAudioInstructionsKind;
  musicNeedsDescription: boolean;
  voiceRequired?: boolean;
  audioInstructions: string;
  setAudioInstructions: (value: string) => void;
}) {
  return (
    <Field
      label={
        instructionsKind === "music"
          ? translate("uxAudio.musicDescriptionnplvh")
          : instructionsKind === "scene"
            ? translate("uxAudio.sceneDescriptiontsg31")
            : instructionsKind === "voice"
              ? translate("uxAudio.voiceOrStyleDescriptionlu32c")
              : translate("uxAudio.styleInstructionsw8lxy")
      }
      hint={
        instructionsKind === "music"
          ? musicNeedsDescription
            ? translate("uxAudio.describeGenreTempoMood4l304")
            : translate("uxAudio.optionalGenreTempoMoodwrvh2")
          : instructionsKind === "scene"
            ? translate("uxAudio.optionalHiggsTTS21swpl")
            : instructionsKind === "voice"
              ? voiceRequired
                ? translate("uxAudio.requiredByThisModel3grt6")
                : translate("uxAudio.optionalUsedByQwen3mghtx")
              : translate("uxAudio.optionalMOSSLocalGuidancerspmp")
      }
      htmlFor="audio-instructions"
    >
      <Textarea
        id="audio-instructions"
        value={audioInstructions}
        onChange={(event) =>
          setAudioInstructions(event.target.value)
        }
        placeholder={
          instructionsKind === "music"
            ? translate("uxAudio.acousticPop96BPMvsvsu")
            : instructionsKind === "scene"
              ? translate("uxAudio.closeMicStudioRecording7d56i")
              : instructionsKind === "voice"
                ? translate("uxAudio.aWarmLowFemaleaoeh9")
                : translate("uxAudio.warmMeasuredDeliveryWithi845j")
        }
        className="min-h-24"
      />
    </Field>
  );
}

export function MossLanguageField({
  audioLanguage,
  setAudioLanguage,
}: {
  audioLanguage: string;
  setAudioLanguage: (value: string) => void;
}) {
  return (
    <Field
      label={translate("settings.appearance.language.title")}
      htmlFor="audio-language"
      hint={translate("uxAudio.optionalButMOSSLocaly2bdd")}
    >
      <Input
        id="audio-language"
        value={audioLanguage}
        onChange={(event) => setAudioLanguage(event.target.value)}
        placeholder={translate("settings.apiKeys.decisionApi.modelEnglish")}
      />
    </Field>
  );
}
