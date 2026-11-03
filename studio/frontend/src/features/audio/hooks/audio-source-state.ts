// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// Free of app imports so the node test runner can load it directly.

import { AUDIO_INPUT_MAX_BYTES } from "../audio-run-request";
import { translate } from "@/i18n";


export type AudioSourceStatus =
  | { phase: "idle" }
  | { phase: "recording"; startedAt: number }
  | { phase: "uploading"; name: string; progress: number | null }
  | { phase: "loading" }
  | { phase: "ready" }
  | { phase: "error"; message: string }
  | { phase: "expired" };

interface AudioSourcePreview {
  /** Selection key drawn, or "local:<n>" for a file still uploading. */
  key: string | null;
  /** The local key of the upload that just got an id, so its late decode still lands. */
  localKey?: string | null;
  peaks: number[] | null;
  durationS: number | null;
  url: string | null;
}

interface AudioSourceState {
  status: AudioSourceStatus;
  preview: AudioSourcePreview;
}

type AudioSourceAction =
  | { type: "record-start"; now: number }
  | { type: "record-stop" }
  | { type: "upload-start"; name: string; key: string }
  | { type: "upload-progress"; progress: number | null }
  | { type: "upload-done"; key: string }
  | { type: "load-start"; key: string }
  | { type: "load-done" }
  | {
      type: "preview";
      key: string;
      peaks: number[] | null;
      durationS: number | null;
      url: string | null;
    }
  | { type: "fail"; message: string }
  | { type: "expire" }
  | { type: "reset" };

const EMPTY_PREVIEW: AudioSourcePreview = {
  key: null,
  peaks: null,
  durationS: null,
  url: null,
};

export const INITIAL_AUDIO_SOURCE_STATE: AudioSourceState = {
  status: { phase: "idle" },
  preview: EMPTY_PREVIEW,
};

/** Mirrors `CONVERT_EXPIRED_DETAIL` on the server: which Convert side's upload expired. */
export const CONVERT_EXPIRED_MESSAGE = {
  get source() { return translate("uxAudio.thisRecordingExpiredAddfvgyi"); },
  get target() { return translate("uxAudio.thisTargetVoiceExpired63bcg"); },
} as const;
export const REFERENCE_EXPIRED_MESSAGE =
  "This reference expired. Add it again.";

export function audioSourceReducer(
  state: AudioSourceState,
  action: AudioSourceAction,
): AudioSourceState {
  switch (action.type) {
    case "record-start":
      return {
        ...state,
        status: { phase: "recording", startedAt: action.now },
      };
    case "record-stop":
      return state.status.phase === "recording"
        ? { ...state, status: { phase: "idle" } }
        : state;
    case "upload-start":
      return {
        status: { phase: "uploading", name: action.name, progress: 0 },
        preview: { ...EMPTY_PREVIEW, key: action.key },
      };
    case "upload-progress":
      if (state.status.phase !== "uploading") return state;
      return {
        ...state,
        status: {
          ...state.status,
          progress:
            action.progress === null
              ? null
              : Math.min(1, Math.max(0, action.progress)),
        },
      };
    case "upload-done":
      return {
        status: { phase: "ready" },
        preview: {
          ...state.preview,
          key: action.key,
          localKey: state.preview.key?.startsWith("local:")
            ? state.preview.key
            : null,
        },
      };
    case "load-start":
      return {
        status: { phase: "loading" },
        preview: { ...EMPTY_PREVIEW, key: action.key },
      };
    case "load-done":
      return state.status.phase === "loading"
        ? { ...state, status: { phase: "ready" } }
        : state;
    case "preview":
      if (
        state.preview.key !== action.key &&
        state.preview.localKey !== action.key
      )
        return state;
      return {
        ...state,
        preview: {
          ...state.preview,
          peaks: action.peaks,
          durationS: action.durationS ?? state.preview.durationS,
          url: action.url ?? state.preview.url,
        },
      };
    case "fail":
      return { ...state, status: { phase: "error", message: action.message } };
    case "expire":
      return { status: { phase: "expired" }, preview: EMPTY_PREVIEW };
    case "reset":
      return INITIAL_AUDIO_SOURCE_STATE;
    default:
      return state;
  }
}

export function audioFileProblem(file: {
  size: number;
  type?: string;
  name?: string;
}): string | null {
  if (file.size <= 0) return translate("uxAudio.thisFileIsEmptywq2ww");
  if (file.size > AUDIO_INPUT_MAX_BYTES)
    return translate("uxAudio.audioIsTooLarge6rn5v");
  const type = file.type ?? "";
  const name = (file.name ?? "").toLowerCase();
  if (
    type &&
    !type.startsWith("audio/") &&
    !type.startsWith("video/") &&
    type !== "application/octet-stream" &&
    !/\.(wav|mp3|flac|ogg|oga|opus|m4a|aac|webm|mp4)$/.test(name)
  ) {
    return translate("uxAudio.thisIsNotAn5b008");
  }
  return null;
}

/** The Settings → Voice microphone, like dictation; "default" leaves the choice to the browser. */
export function micAudioConstraints(
  deviceId: string | null | undefined,
): MediaTrackConstraints {
  const base = { echoCancellation: true, noiseSuppression: true };
  return deviceId && deviceId !== "default"
    ? { ...base, deviceId: { exact: deviceId } }
    : base;
}

export function micErrorMessage(error: unknown, desktop: boolean): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? (error as { name?: unknown }).name
      : undefined;
  if (name === "NotAllowedError" || name === "SecurityError") {
    // The desktop WebView has no site-permission UI, so Settings is the only way back.
    return desktop
      ? "Microphone access is blocked. Open Settings > Voice and click Allow microphone, or upload a file instead."
      : translate("uxAudio.microphoneAccessIsBlockeddl9rf");
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return translate("uxAudio.noMicrophoneWasFound3s6r3");
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return translate("uxAudio.theMicrophoneIsInuzpuw");
  }
  return translate("uxAudio.couldNotUseThe7shc7");
}
