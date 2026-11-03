// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { MIN_RANGE_S } from "../components/waveform-range";
import type {
  MusicEditAction,
  MusicEditDraft,
  MusicModeRule,
} from "./music-types";
import { translate } from "@/i18n";


export const MUSIC_EDIT_ACTION_LABEL: Record<MusicEditAction, string> = {
  repaint: "Repaint",
  extend: "Extend",
  cover: "Cover",
  get continue() { return translate("uxAudio.addPartsdblzz"); },
  inpaint: "Inpaint",
  restyle: "Restyle",
};

export const MUSIC_EDIT_ACTION_HINT: Record<MusicEditAction, string> = {
  get repaint() { return translate("uxAudio.regenerateTheSelectedPartohhqr"); },
  get extend() { return translate("uxAudio.addNewMusicAfterm4r6r"); },
  get cover() { return translate("uxAudio.sameStructureNewStylek3vzl"); },
  get continue() { return translate("uxAudio.addsNewPartsAcrossfhk2q"); },
  get inpaint() { return translate("uxAudio.regenerateTheSelectedPartsyh4oj"); },
  get restyle() { return translate("uxAudio.reRenderTheWholeoi0h7"); },
};

export const REPAINT_BEYOND_END_S = 30;

export const EXTEND_MIN_S = 5;
export const EXTEND_MAX_S = 120;

export const MUSIC_EDIT_DEFAULT_STRENGTH: Partial<
  Record<MusicEditAction, number>
> = {
  cover: 0.5,
  restyle: 0.45,
};

export function editUsesRanges(action: MusicEditAction | null): boolean {
  return action === "repaint" || action === "inpaint";
}

export function editUsesStrength(action: MusicEditAction | null): boolean {
  return action === "cover" || action === "restyle";
}

export function editMaxRanges(
  rule: MusicModeRule,
  action: MusicEditAction | null,
): number {
  if (action === "repaint") return 1;
  if (action === "inpaint") return Math.max(1, rule.max_ranges ?? 1);
  return 0;
}

export function editBeyondEndS(action: MusicEditAction | null): number {
  return action === "repaint" ? REPAINT_BEYOND_END_S : 0;
}

export function editActions(rule: MusicModeRule): MusicEditAction[] {
  return rule.actions ?? [];
}

export function formatEditLimit(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  return `${Math.round(seconds)} s`;
}

export function editSourceTooLong(
  rule: MusicModeRule,
  sourceDurationS: number | null,
): string | null {
  if (rule.max_source_s === undefined || sourceDurationS === null) return null;
  return sourceDurationS > rule.max_source_s
    ? translate("uxAudio.editClipsUpTo5bz68", { p1: formatEditLimit(rule.max_source_s) })
    : null;
}

// Times come back rounded to a hundredth; allow that much slack.
const EPSILON = 0.011;

export function editRangeProblem(
  rule: MusicModeRule,
  draft: Pick<MusicEditDraft, "action" | "ranges">,
  sourceDurationS: number | null,
): string | null {
  const { action, ranges } = draft;
  if (!editUsesRanges(action)) return null;
  if (ranges.length === 0) {
    return action === "inpaint"
      ? translate("uxAudio.selectThePartsTo7c6jk")
      : translate("uxAudio.selectThePartToj1b7l");
  }
  const max = editMaxRanges(rule, action);
  if (ranges.length > max) {
    return max === 1
      ? translate("uxAudio.selectOnePartTon9l69")
      : translate("uxAudio.selectUpToParts9jv9o", { p1: max });
  }
  for (const range of ranges) {
    if (
      !(Number.isFinite(range.start_s) && Number.isFinite(range.end_s)) ||
      range.start_s < 0 ||
      range.end_s - range.start_s < MIN_RANGE_S - EPSILON
    ) {
      return translate("uxAudio.makeEachSelectedPartohzeq", { p1: MIN_RANGE_S });
    }
    if (sourceDurationS === null) continue;
    if (range.start_s >= sourceDurationS) {
      return translate("uxAudio.aSelectedPartStartsukefd");
    }
    if (range.end_s > sourceDurationS + editBeyondEndS(action) + EPSILON) {
      return action === "repaint"
        ? translate("uxAudio.aRepaintCanReacheu8rc", { p1: REPAINT_BEYOND_END_S })
        : translate("uxAudio.aSelectedPartRunsr5w3k");
    }
  }
  return null;
}

export function musicEditProblem(
  rule: MusicModeRule,
  draft: MusicEditDraft,
  sourceDurationS: number | null,
): string | null {
  if (!draft.source) return translate("uxAudio.pickAClipTo7dfb2");
  const actions = editActions(rule);
  if (actions.length === 0) return translate("uxAudio.thisModelCannotEdit10xpk");
  if (!(draft.action && actions.includes(draft.action))) {
    return translate("uxAudio.pickWhatToDov6dz1");
  }
  const tooLong = editSourceTooLong(rule, sourceDurationS);
  if (tooLong) return tooLong;
  const rangeProblem = editRangeProblem(rule, draft, sourceDurationS);
  if (rangeProblem) return rangeProblem;
  if (
    draft.action === "extend" &&
    !(draft.extendS >= EXTEND_MIN_S && draft.extendS <= EXTEND_MAX_S)
  ) {
    return translate("uxAudio.addBetweenAndSecondsak106", { p1: EXTEND_MIN_S, p2: EXTEND_MAX_S });
  }
  if (!draft.prompt.trim()) {
    return editUsesStrength(draft.action)
      ? translate("uxAudio.describeTheNewStyle05v8c")
      : translate("uxAudio.describeWhatTheNew62sa9");
  }
  return null;
}

export type SendAction = "edit" | "extend";

export function sendActionsFor(
  editActions: readonly string[],
): readonly SendAction[] {
  if (editActions.length === 0) return [];
  return editActions.includes("extend") ? ["edit", "extend"] : ["edit"];
}
