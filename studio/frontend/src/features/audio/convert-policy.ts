// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { AudioConvertCaps } from "@/features/chat/types/api";
import type {
  AudioSourceSelection,
  ConvertMode,
  ConvertStyle,
} from "./audio-run-request";
import type { AudioModelContext } from "./tools/types";
import { translate } from "@/i18n";


export const CONVERT_MODEL_ORDER: string[] = [
  "SeedVC-MLX-GGUF",
  "RVC-GGUF",
  "MeanVC2-GGUF",
  "Chatterbox-GGUF",
  "Vevo2-GGUF",
];

export function convertCaps(
  ctx: Pick<AudioModelContext, "convert">,
): AudioConvertCaps | null {
  return ctx.convert && ctx.convert.modes.length > 0 ? ctx.convert : null;
}

// Singing keeps the recording's style: a sung transcript is lyrics, which STT gets wrong.
export function effectiveConvertStyle(
  caps: AudioConvertCaps | null,
  mode: ConvertMode,
  style: ConvertStyle,
): ConvertStyle {
  return caps?.style && mode === "speech" ? style : "source";
}

export function convertPitchSupport(
  caps: AudioConvertCaps | null,
  mode: ConvertMode,
  style: ConvertStyle,
): { show: boolean; auto: boolean; shiftWithAuto: boolean } {
  const pitch = caps?.modes.includes(mode) ? caps.pitch[mode] : undefined;
  if (!pitch || effectiveConvertStyle(caps, mode, style) === "target") {
    return { show: false, auto: false, shiftWithAuto: false };
  }
  const auto = pitch.auto === true;
  return {
    show: true,
    auto,
    shiftWithAuto: auto && pitch.shift_with_auto === true,
  };
}

export function convertServerTask(
  caps: AudioConvertCaps | null,
  workflowTasks: Readonly<Record<string, string>> | null | undefined,
  mode: ConvertMode,
): string | null {
  if (!caps?.modes.includes(mode) || !workflowTasks) return null;
  return (
    workflowTasks[`convert:${mode}`] ??
    (mode === "speech" ? workflowTasks.convert : undefined) ??
    null
  );
}

export type ConvertBlockerKind =
  | "source"
  | "source-error"
  | "source-expired"
  | "target"
  | "target-error"
  | "target-expired"
  | "mode"
  | "source-text"
  | "panel";

export interface ConvertBlockerInput {
  source: AudioSourceSelection | null;
  sourceBusy: boolean;
  sourceExpired: boolean;
  sourceError: string | null;
  target: AudioSourceSelection | null;
  targetBusy: boolean;
  targetExpired: boolean;
  targetError: string | null;
  builtinVoice: string;
  caps: AudioConvertCaps | null;
  mode: ConvertMode;
  style: ConvertStyle;
  sourceText: string;
  panelError: string | null;
}

export const CONVERT_SOURCE_MISSING = "Add the recording to convert.";
export const CONVERT_TARGET_MISSING = "Add the target voice.";
export const CONVERT_BUILTIN_MISSING = "Pick a built-in voice.";
export const CONVERT_SINGING_UNSUPPORTED =
  "This model does not convert singing. Switch to Speech.";
export const CONVERT_SOURCE_TEXT_MISSING = "Add what's said in the recording.";
export const CONVERT_INPUTS_MISSING =
  "Add the recording to convert and the target voice.";

type ConvertBlocker = { kind: ConvertBlockerKind; reason: string };

function inputBlocker(
  selection: AudioSourceSelection | null,
  busy: boolean,
  expired: boolean,
  error: string | null,
  side: "source" | "target",
): ConvertBlocker | null {
  const expiredKey =
    side === "source"
      ? "uxAudio.theRecordingIsNoLongerP37xn"
      : "uxAudio.theTargetVoiceIsNoLongerL52qb";
  const busyKey =
    side === "source"
      ? "uxAudio.waitingForTheRecordingToH64md"
      : "uxAudio.waitingForTheTargetVoiceT19fz";
  if (expired) {
    return {
      kind: `${side}-expired`,
      reason: translate(expiredKey),
    };
  }
  if (busy) {
    return {
      kind: side,
      reason: translate(busyKey),
    };
  }
  if (error && !selection) return { kind: `${side}-error`, reason: error };
  if (!selection) {
    return {
      kind: side,
      reason:
        side === "source" ? CONVERT_SOURCE_MISSING : CONVERT_TARGET_MISSING,
    };
  }
  return null;
}

function builtinBlocker(
  caps: AudioConvertCaps,
  builtinVoice: string,
): ConvertBlocker | null {
  const voice = builtinVoice.trim();
  const known =
    caps.builtin_voices.length === 0 ||
    caps.builtin_voices.some((item) => item.id === voice);
  return voice && known
    ? null
    : { kind: "target", reason: CONVERT_BUILTIN_MISSING };
}

export function convertBlocker(
  input: ConvertBlockerInput,
): ConvertBlocker | null {
  const source = inputBlocker(
    input.source,
    input.sourceBusy,
    input.sourceExpired,
    input.sourceError,
    "source",
  );
  const target =
    input.caps?.target === "builtin"
      ? builtinBlocker(input.caps, input.builtinVoice)
      : inputBlocker(
          input.target,
          input.targetBusy,
          input.targetExpired,
          input.targetError,
          "target",
        );
  // Name everything still missing at once, so nothing new appears after the first fix.
  if (
    source?.kind === "source" &&
    !input.source &&
    !input.sourceBusy &&
    target?.kind === "target" &&
    !input.target &&
    input.caps?.target !== "builtin"
  ) {
    return { kind: "source", reason: CONVERT_INPUTS_MISSING };
  }
  if (source?.kind === "source-expired" && target?.kind === "target-expired") {
    return {
      kind: "source-expired",
      get reason() { return translate("uxAudio.theRecordingAndTarget0pjy4"); },
    };
  }
  const blocker = source ?? target;
  if (blocker) return blocker;
  if (input.caps && !input.caps.modes.includes(input.mode)) {
    return { kind: "mode", reason: CONVERT_SINGING_UNSUPPORTED };
  }
  if (
    effectiveConvertStyle(input.caps, input.mode, input.style) === "target" &&
    !input.sourceText.trim()
  ) {
    return { kind: "source-text", reason: CONVERT_SOURCE_TEXT_MISSING };
  }
  return input.panelError ? { kind: "panel", reason: input.panelError } : null;
}

// Measured on GPU; families missing here get no estimate.
const CONVERT_RELOAD_SECONDS: Readonly<Record<string, string>> = {
  seed_vc: "4–8",
  vevo2: "6",
  chatterbox: "2",
  meanvc2: "2",
};

export interface ConvertSwitchInput {
  modelName: string;
  loadedTask: string | null;
  nextTask: string | null;
  routeChange: boolean;
  family?: string | null;
}

export function convertSwitchNotice(
  input: ConvertSwitchInput,
): { before: string; during: string } | null {
  const taskChange = Boolean(
    input.loadedTask && input.nextTask && input.loadedTask !== input.nextTask,
  );
  if (!taskChange && !input.routeChange) return null;
  const name = input.modelName.trim() || translate("uxAudio.theModel4h1ky");
  const what = !taskChange
    ? translate("uxAudio.theNewEnginecx8sk")
    : input.nextTask === "svc"
      ? translate("uxAudio.singingTasknw2dr")
      : translate("uxAudio.convertTaskvb6hq");
  const estimate = input.family ? CONVERT_RELOAD_SECONDS[input.family] : undefined;
  const tail = estimate
    ? `, ${translate("uxAudio.aboutSecondsxq7vn", { p1: estimate })}`
    : "";
  return {
    before: taskChange
      ? translate("uxAudio.reloadsForModejk4wt", { p1: name, p2: what, p3: tail })
      : translate("uxAudio.reloadsNewEnginepm9zc", { p1: name, p2: tail }),
    during: translate("uxAudio.switchingTomg61m", { p1: name, p2: what }),
  };
}
