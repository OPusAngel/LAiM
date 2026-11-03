// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// Import-free so node tests can load it.

import { translate } from "@/i18n";

export interface SttCapabilities {
  engine: string | null;
  family: string | null;
  /** on_request: only when asked (Qwen3-ASR with its aligner); always: every run has them. */
  timestamps: "on_request" | "always" | "unsupported";
  speakers: boolean;
  aligner: {
    downloaded: boolean;
    size_bytes: number;
    id?: string;
    variant?: string;
  } | null;
  cpu_only: boolean;
}

export interface TranscribeSwitch {
  checked: boolean;
  disabled: boolean;
  hint: string;
  suggestSpeakersModel?: boolean;
  always?: boolean;
}

export interface TranscribeSwitches {
  timestamps: TranscribeSwitch;
  speakers: TranscribeSwitch;
  notice: string | null;
  request: { timestamps: boolean; speakers: boolean };
}

export const SPEAKERS_MODEL_NAME = "MOSS-Transcribe-Diarize";

/** The aligner download a timestamped run needs first, staged like any other quant so it shows in
 *  the Downloads panel; null when the run can start now. */
export function alignerDownloadEntry(
  caps: SttCapabilities | null,
  timestamps: boolean,
): {
  repoId: string;
  files: string[];
  bytes: number;
  ggufVariant: string;
} | null {
  const aligner = caps?.aligner;
  if (!timestamps || !aligner || aligner.downloaded) return null;
  if (!aligner.id || !aligner.variant) return null;
  return {
    repoId: aligner.id,
    files: [],
    bytes: aligner.size_bytes,
    ggufVariant: aligner.variant,
  };
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

export function transcribeSwitches(
  caps: SttCapabilities | null,
  prefs: { timestamps: boolean; speakers: boolean },
  state: { loading: boolean; hasModel: boolean },
): TranscribeSwitches {
  if (!caps) {
    const hint = state.loading
      ? translate("uxAudio.checkingWhatThisModelt7839")
      : state.hasModel
        ? translate("uxAudio.couldNotCheckWhatipwe0")
        : translate("uxAudio.pickASpeechTobh5cp");
    const off = { checked: false, disabled: true, hint };
    return {
      timestamps: off,
      speakers: off,
      notice: null,
      request: { timestamps: false, speakers: false },
    };
  }

  const onRequest = caps.timestamps === "on_request";
  const size =
    onRequest && caps.aligner && !caps.aligner.downloaded
      ? formatSize(caps.aligner.size_bytes)
      : null;
  const timestamps: TranscribeSwitch =
    caps.timestamps === "always"
      ? {
          checked: true,
          disabled: true,
          always: true,
          get hint() { return translate("uxAudio.thisModelAlwaysAddsm0iug"); },
        }
      : onRequest
        ? {
            checked: prefs.timestamps,
            disabled: false,
            hint: size
              ? translate("uxAudio.addsLineTimesWithDownload73mn", { p1: size })
              : translate("uxAudio.addsLineTimesG28vk"),
          }
        : {
            checked: false,
            disabled: true,
            get hint() { return translate("uxAudio.thisModelReturnsPlaintz104", { p1: SPEAKERS_MODEL_NAME }); },
            suggestSpeakersModel: true,
          };
  const speakers: TranscribeSwitch = caps.speakers
    ? {
        checked: prefs.speakers,
        disabled: false,
        get hint() { return translate("uxAudio.labelsWhoIsSpeaking9tk7k"); },
      }
    : {
        checked: false,
        disabled: true,
        get hint() { return translate("uxAudio.onlyAndVibeVoiceASRvsq3w", { p1: SPEAKERS_MODEL_NAME }); },
        suggestSpeakersModel: true,
      };
  const request = {
    timestamps: onRequest && prefs.timestamps,
    speakers: speakers.checked,
  };
  const aligner = !request.timestamps
    ? null
    : size
      ? translate("uxAudio.downloadsTheTimingAligner576ty", { p1: size })
      : translate("uxAudio.reloadsTheModelWith4b8d2");
  const notice = !caps.cpu_only
    ? aligner
    : aligner
      ? `${aligner} Runs on the CPU.`
      : translate("uxAudio.thisModelRunsOnf31fp");
  return { timestamps, speakers, notice, request };
}
