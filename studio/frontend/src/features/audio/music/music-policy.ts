// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// No app imports: the node test runner loads this directly.

import { translate } from "@/i18n";
import type {
  AudioOptionScalar,
  AudioTextRunRequest,
  AudioSourceSelection,
} from "../audio-run-request";
import { sourceRefOf } from "../audio-run-request";
import { MUSIC_EDIT_DEFAULT_STRENGTH } from "./music-edit-rules";
import type {
  MusicCapabilities,
  MusicEditDraft,
  MusicMode,
  MusicModeRule,
  MusicSfxDraft,
  MusicSongDraft,
} from "./music-types";

export const MUSIC_MODE_LABELS: Record<MusicMode, string> = {
  song: "Song",
  sfx: "Sound effect",
  edit: "Edit",
};

export const MUSIC_MODE_HINTS: Record<MusicMode, string> = {
  get song() { return translate("uxAudio.aSongOrAnnpi1v"); },
  sfx: "A short sound from a description.",
  get edit() { return translate("uxAudio.changePartOfAugb0f"); },
};

export function musicModeLabel(rule: MusicModeRule): string {
  return rule.id === "song" && rule.instrumental === "always"
    ? "Instrumental"
    : MUSIC_MODE_LABELS[rule.id];
}

export function musicModeHint(rule: MusicModeRule): string {
  return rule.id === "song" && rule.instrumental === "always"
    ? translate("uxAudio.musicWithoutVocalsFromihmun")
    : MUSIC_MODE_HINTS[rule.id];
}

export const MUSIC_MAX_VARIATIONS = 4;

export function effectiveMusicMode(
  capabilities: MusicCapabilities,
  picked: MusicMode,
): MusicModeRule {
  return (
    capabilities.modes.find((rule) => rule.id === picked) ??
    capabilities.modes[0]
  );
}

/** A clip sent to edit stays in view even when the model cannot edit; Edit then says to load one that can. */
export function withWaitingEdit(
  capabilities: MusicCapabilities,
  editWaiting: boolean,
): MusicCapabilities {
  if (!editWaiting || capabilities.modes.some((rule) => rule.id === "edit")) {
    return capabilities;
  }
  return { modes: [...capabilities.modes, { id: "edit" }] };
}

const SECTION_NAMES = [
  "Intro",
  "Verse",
  "Pre-chorus",
  "Chorus",
  "Bridge",
  "Outro",
] as const;

export interface SectionTag {
  name: string;
  tag: string;
}

export function sectionTags(
  sectionCase: MusicModeRule["section_case"],
): SectionTag[] {
  return SECTION_NAMES.map((name) => ({
    name,
    tag:
      sectionCase === "title"
        ? `[${name.replace(/(^|-)([a-z])/g, (_m, dash: string, ch: string) => dash + ch.toUpperCase())}]`
        : `[${name.toLowerCase()}]`,
  }));
}

export function insertSectionTag(
  text: string,
  cursor: number,
  tag: string,
): { text: string; cursor: number } {
  const at = Math.max(0, Math.min(cursor, text.length));
  const before = text.slice(0, at);
  const after = text.slice(at);
  const lead =
    before.length === 0
      ? ""
      : before.endsWith("\n\n")
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n";
  const tail = after.startsWith("\n") ? "" : "\n";
  const inserted = `${lead}${tag}${tail}`;
  return {
    text: before + inserted + after,
    cursor: before.length + lead.length + tag.length + 1,
  };
}

export interface InstrumentalChoice {
  shown: boolean;
  enabled: boolean;
  value: boolean;
  reason: string | null;
}

export function instrumentalChoice(
  rule: MusicModeRule,
  picked: boolean,
): InstrumentalChoice {
  switch (rule.instrumental) {
    case "toggle":
      return { shown: true, enabled: true, value: picked, reason: null };
    case "always":
      return {
        shown: false,
        enabled: false,
        value: true,
        get reason() { return translate("uxAudio.thisModelMakesInstrumentalsjyhc9"); },
      };
    case "never":
      return {
        shown: true,
        enabled: false,
        value: false,
        get reason() { return translate("uxAudio.thisModelAlwaysSings4gqr5"); },
      };
    default:
      return { shown: false, enabled: false, value: false, reason: null };
  }
}

export function lyricsShown(
  rule: MusicModeRule,
  instrumental: boolean,
): boolean {
  if (rule.id !== "song") return false;
  if (rule.lyrics === "unused" || rule.lyrics === undefined) return false;
  return !instrumental;
}

export function durationLabel(rule: MusicModeRule): string {
  return rule.duration?.approximate
    ? translate("uxAudio.lengthSecondsApproximate2rfj2")
    : translate("uxAudio.lengthSecondsh9uv7");
}

export function musicDurationFor(
  rule: MusicModeRule,
  picked: number | null,
): number | null {
  const duration = rule.duration;
  if (!duration) return null;
  if (picked === null || !Number.isFinite(picked)) return duration.default;
  return Math.min(duration.max, Math.max(duration.min, picked));
}

export function variationsMax(rule: MusicModeRule): number | null {
  const variations = rule.variations;
  if (!variations || variations.max < 2) return null;
  return Math.min(variations.max, MUSIC_MAX_VARIATIONS);
}

export function variationsFor(rule: MusicModeRule, picked: number): number {
  const max = variationsMax(rule);
  if (max === null) return 1;
  return Math.max(1, Math.min(max, Math.floor(picked) || 1));
}

export function reloadNotice(
  rule: MusicModeRule,
  variations: number,
  modelName: string | null,
): string | null {
  const rules = rule.variations;
  if (!rules || rules.how !== "batch" || variations <= rules.loaded)
    return null;
  const name = modelName?.trim() || translate("uxAudio.theModel4h1ky");
  return translate("uxAudio.reloadsToMakeVariationsn27dg", { p1: name, p2: variations });
}

export const MUSIC_EXAMPLES = {
  description: [
    {
      get label() {
        return translate("uxAudio.acousticPop1fiii");
      },
      get text() {
        return translate("uxAudio.upbeatAcousticPopBright19863");
      },
    },
    {
      get label() {
        return translate("uxAudio.loFiHipHop4vgdp");
      },
      get text() {
        return translate("uxAudio.loFiHipHop1oicu");
      },
    },
    {
      get label() {
        return translate("uxAudio.orchestral1ub5c");
      },
      get text() {
        return translate("uxAudio.epicOrchestralTrailerMusic124nw");
      },
    },
  ], get instrumental() { return [
    {
      get label() {
        return translate("uxAudio.loFi1qrf3");
      },
      get text() {
        return translate("uxAudio.warmLoFiHipa13xr");
      },
    },
    {
      get label() {
        return translate("uxAudio.house1e9xq");
      },
      get text() {
        return translate("uxAudio.upliftingHouseMusicWith1ekhw");
      },
    },
    {
      get label() {
        return translate("uxAudio.orchestral1ub5c");
      },
      get text() {
        return translate("uxAudio.epicOrchestralTrailerMusic124nw");
      },
    },
  ]; }, get lyrics() { return [
    {
      get label() {
        return translate("uxAudio.riverSong1gtak");
      },
      get text() {
        return translate("uxAudio.sunlightOnTheRiverko6k3");
      },
    },
  ]; }, get sfx() { return [
    { label: translate("uxAudio.rain2q0iy"), get text() { return translate("uxAudio.heavyRainOnA8lbm9"); } },
    { label: translate("uxAudio.footstepsp83ch"), get text() { return translate("uxAudio.footstepsOnGravelSlow1av60"); } },
    { label: translate("uxAudio.creakyDoorbi6x9"), get text() { return translate("uxAudio.aDoorCreakingOpen1hr3l"); } },
  ]; }, get edit() { return [
    translate("uxAudio.sameMelodyWithAmxa9a"),
    translate("uxAudio.softerWithOnlyPianowpmfa"),
  ]; },
} as const;

export function exampleLyrics(
  sectionCase: MusicModeRule["section_case"],
  text: string,
): string {
  const [verse, chorus] = text.split("\n\n");
  const tags = sectionTags(sectionCase);
  const tag = (name: string) => tags.find((item) => item.name === name)?.tag;
  return chorus
    ? `${tag("Verse")}\n${verse}\n\n${tag("Chorus")}\n${chorus}`
    : `${tag("Verse")}\n${verse}`;
}

export interface MusicInputs {
  rule: MusicModeRule;
  description: string;
  lyrics: string;
  song: MusicSongDraft;
  sfx: MusicSfxDraft;
  edit: MusicEditDraft;
  editProblem?: string | null;
}

export function musicBlocker(inputs: MusicInputs): string | null {
  const { rule } = inputs;
  if (rule.id === "song") {
    const instrumental = instrumentalChoice(
      rule,
      inputs.song.instrumental,
    ).value;
    const description = inputs.description.trim();
    const lyrics = inputs.lyrics.trim();
    if (rule.description === "required" && !description)
      return translate("uxAudio.describeTheMusicThismm8n8");
    if (rule.lyrics === "required" && !instrumental && !lyrics)
      return translate("uxAudio.writeTheLyricsThist5bk6");
    if (!description && (!lyrics || instrumental))
      return instrumental
        ? translate("uxAudio.describeTheMusicYouq9mnr")
        : translate("uxAudio.describeTheMusicOru549j");
    return null;
  }
  if (rule.id === "sfx") {
    return inputs.sfx.prompt.trim() ? null : translate("uxAudio.describeTheSoundYou2axj5");
  }
  return inputs.editProblem ?? null;
}

export function buildMusicRunRequest(
  inputs: MusicInputs & {
    options?: Record<string, AudioOptionScalar>;
    seed?: number | null;
  },
): AudioTextRunRequest {
  const { rule } = inputs;
  const base = {
    workflow: "music" as const,
    options: inputs.options,
    seed: inputs.seed ?? null,
  };
  if (rule.id === "song") {
    const instrumental = instrumentalChoice(
      rule,
      inputs.song.instrumental,
    ).value;
    const sendLyrics = lyricsShown(rule, instrumental);
    return {
      ...base,
      text: inputs.description.trim(),
      music: {
        mode: "song",
        lyrics: sendLyrics ? inputs.lyrics : null,
        instrumental: rule.instrumental === "toggle" ? instrumental : false,
        duration_s: musicDurationFor(rule, inputs.song.durationS),
        variations: variationsFor(rule, inputs.song.variations),
      },
    };
  }
  if (rule.id === "sfx") {
    return {
      ...base,
      text: inputs.sfx.prompt.trim(),
      music: {
        mode: "sfx",
        duration_s: musicDurationFor(rule, inputs.sfx.durationS),
        variations: variationsFor(rule, inputs.sfx.variations),
      },
    };
  }
  const edit = inputs.edit;
  const action = edit.action ?? rule.actions?.[0] ?? "repaint";
  const usesRanges = action === "repaint" || action === "inpaint";
  return {
    ...base,
    text: edit.prompt.trim(),
    music: {
      mode: "edit",
      source: editSourceRef(edit.source),
      duration_s: action === "continue" ? musicDurationFor(rule, null) : null,
      edit: {
        action,
        ranges: usesRanges ? edit.ranges : [],
        // Send the value the slider shows; the runtime defaults (1.0) differ.
        strength:
          action === "cover" || action === "restyle"
            ? (edit.strength ?? MUSIC_EDIT_DEFAULT_STRENGTH[action] ?? null)
            : null,
        extend_s: action === "extend" ? edit.extendS : null,
      },
    },
  };
}

function editSourceRef(source: AudioSourceSelection | null) {
  if (!source || source.kind === "voice") return null;
  return sourceRefOf(source);
}
