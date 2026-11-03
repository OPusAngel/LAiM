// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// Free of app imports so the node test runner and the sidebar can load it directly.

import { translate } from "@/i18n";
import {
  ArrowReloadHorizontalIcon,
  ClosedCaptionIcon,
  Copy02Icon,
  Edit03Icon,
  MusicThreeIcon,
  SplitIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { TextToSpeechIcon } from "../../lib/hugeicons-derived.ts";
import { AUDIO_CPP_MUSIC_AUDIO_TYPE } from "./audio-cpp-catalog.ts";

export type AudioWorkflowId =
  | "speak"
  | "clone"
  | "edit"
  | "convert"
  | "music"
  | "separate"
  | "transcribe";

export type AudioWorkflowSlot = "speak" | "transcribe";

export const AUDIO_WORKFLOWS: ReadonlyArray<{
  id: AudioWorkflowId;
  label: string;
  heading: string;
  icon: IconSvgElement;
  hint: string;
  slot: AudioWorkflowSlot;
  createTrain: boolean;
}> = [
  {
    id: "speak",
    get label() {
      return translate("uxAudio.textToSpeech1e911");
    },
    get heading() {
      return translate("settings.voice.readAloud.ttsLabel");
    },
    icon: TextToSpeechIcon,
    get hint() {
      return translate("uxAudio.turnTextIntoSpeech108e5");
    },
    slot: "speak",
    createTrain: true,
  },
  {
    id: "clone",
    get label() {
      return translate("settings.apiKeys.audioApi.clone");
    },
    get heading() {
      return translate("uxAudio.cloneAVoice18c2w");
    },
    icon: Copy02Icon,
    get hint() {
      return translate("uxAudio.speakInTheVoice1n6je");
    },
    slot: "speak",
    createTrain: true,
  },
  {
    id: "edit",
    get label() {
      return translate("shell.sections.edit");
    },
    get heading() {
      return translate("uxAudio.editSpeech1vobw");
    },
    icon: Edit03Icon,
    get hint() {
      return translate("uxAudio.changeWordsInA1tesd");
    },
    slot: "speak",
    createTrain: false,
  },
  {
    id: "convert",
    get label() {
      return translate("settings.apiKeys.audioApi.convert");
    },
    get heading() {
      return translate("uxAudio.convertVoice12cem");
    },
    icon: ArrowReloadHorizontalIcon,
    get hint() {
      return translate("uxAudio.makeARecordingSound1obae");
    },
    slot: "speak",
    createTrain: false,
  },
  {
    id: "music",
    get label() {
      return translate("settings.apiKeys.audioApi.music");
    },
    get heading() {
      return translate("uxAudio.createMusicbn9an");
    },
    icon: MusicThreeIcon,
    get hint() {
      return translate("uxAudio.songsInstrumentalsAndSound1p4h3");
    },
    slot: "speak",
    createTrain: false,
  },
  {
    id: "separate",
    get label() {
      return translate("settings.apiKeys.audioApi.separate");
    },
    get heading() {
      return translate("uxAudio.separateAudio1brli");
    },
    icon: SplitIcon,
    get hint() {
      return translate("uxAudio.splitATrackInto1f54e");
    },
    slot: "speak",
    createTrain: false,
  },
  {
    id: "transcribe",
    get label() {
      return translate("settings.apiKeys.audioApi.transcribe");
    },
    get heading() {
      return translate("settings.apiKeys.audioApi.transcribe");
    },
    icon: ClosedCaptionIcon,
    get hint() {
      return translate("uxAudio.turnSpeechIntoTextfsi0h");
    },
    slot: "transcribe",
    createTrain: true,
  },
];

/** Mirrors MUSIC_AUDIO_TYPES in studio/backend/core/inference/audio_workflows.py. */
export const MUSIC_AUDIO_TYPES: ReadonlySet<string> = new Set([
  "minimax_music3",
  AUDIO_CPP_MUSIC_AUDIO_TYPE,
]);

export function isAudioWorkflowId(value: unknown): value is AudioWorkflowId {
  return AUDIO_WORKFLOWS.some((tab) => tab.id === value);
}

export function audioWorkflowTab(id: AudioWorkflowId) {
  return AUDIO_WORKFLOWS.find((tab) => tab.id === id) ?? AUDIO_WORKFLOWS[0];
}

export function slotForWorkflow(id: AudioWorkflowId): AudioWorkflowSlot {
  return audioWorkflowTab(id).slot;
}

export function audioWorkflowForTask(
  task: string | null | undefined,
): AudioWorkflowId | null {
  switch (task) {
    case "text-to-speech":
      return "speak";
    case "automatic-speech-recognition":
      return "transcribe";
    case "text-to-audio":
      return "music";
    default:
      return null;
  }
}

export function audioWorkflowForAudioType(
  audioType: string | null | undefined,
): "speak" | "music" {
  return audioType && MUSIC_AUDIO_TYPES.has(audioType) ? "music" : "speak";
}

export function clipWorkflow(clip: {
  workflow?: string | null;
  audio_type?: string | null;
}): "speak" | "clone" | "edit" | "convert" | "music" | "separate" {
  if (
    clip.workflow === "speak" ||
    clip.workflow === "clone" ||
    clip.workflow === "edit" ||
    clip.workflow === "convert" ||
    clip.workflow === "music" ||
    clip.workflow === "separate"
  ) {
    return clip.workflow;
  }
  return audioWorkflowForAudioType(clip.audio_type);
}

export function workflowForLoadedModel({
  current,
  audioWorkflows,
  music,
}: {
  current: AudioWorkflowId;
  audioWorkflows: readonly string[] | null | undefined;
  music: boolean;
}): AudioWorkflowId {
  const runnable = (audioWorkflows ?? []).filter(
    (id): id is AudioWorkflowId =>
      isAudioWorkflowId(id) && slotForWorkflow(id) === "speak",
  );
  if (runnable.includes(current)) return current;
  if (runnable.length > 0) return runnable[0];
  return music ? "music" : "speak";
}

/** Older backends send no list: the audio type picks Music or Speak, and nothing clones. */
export function loadedModelRunsWorkflow({
  workflow,
  audioWorkflows,
  music,
}: {
  workflow: AudioWorkflowId;
  audioWorkflows: readonly string[] | null | undefined;
  music: boolean;
}): boolean {
  if (audioWorkflows && audioWorkflows.length > 0) {
    return audioWorkflows.includes(workflow);
  }
  return workflow === (music ? "music" : "speak");
}
