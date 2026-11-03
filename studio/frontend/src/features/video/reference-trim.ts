// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";

export const H3_REFERENCE_MIN_SECONDS = 2;
export const H3_REFERENCE_MAX_SECONDS = 15;
// Matches validate_h3_reference_trim's slack. Exact comparison refused intervals the server
// accepts: the 0.1-step inputs reach 2.3 - 0.3, which is 1.9999999999999998.
const DURATION_EPSILON = 1e-6;

export interface ReferenceVideoTrimFeedback {
  message: string;
  invalid: boolean;
}

export interface ReferenceVideoTrim {
  start: number | null;
  end: number | null;
}

/** Select the first model-sized interval when a source is too long. */
export function defaultReferenceVideoTrim(
  sourceDuration?: number,
): ReferenceVideoTrim {
  return sourceDuration !== undefined &&
    sourceDuration > H3_REFERENCE_MAX_SECONDS
    ? { start: 0, end: H3_REFERENCE_MAX_SECONDS }
    : { start: null, end: null };
}

/** Return user-facing validation for one optional reference-video interval. */
export function referenceVideoTrimError(
  label: string,
  start: number | null,
  end: number | null,
  sourceDuration?: number,
): string | null {
  // No interval inside a too-short source can reach the minimum, so say so here instead of letting
  // the decoder refuse it later.
  if (
    sourceDuration !== undefined &&
    sourceDuration + DURATION_EPSILON < H3_REFERENCE_MIN_SECONDS
  ) {
    return `${label} is shorter than the 2 second minimum`;
  }
  if ((start === null) !== (end === null)) {
    return translate("uxVideo.setBothStartAnd1f6if", { p1: label });
  }
  if (start === null || end === null) {
    return sourceDuration !== undefined &&
      sourceDuration > H3_REFERENCE_MAX_SECONDS
      ? translate("uxVideo.selectA2Toclmc7", { p1: label })
      : null;
  }
  const duration = end - start;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    duration + DURATION_EPSILON < H3_REFERENCE_MIN_SECONDS ||
    duration - DURATION_EPSILON > H3_REFERENCE_MAX_SECONDS ||
    (sourceDuration !== undefined && end > sourceDuration + DURATION_EPSILON)
  ) {
    return translate("uxVideo.choose2To15gw30v", { p1: label });
  }
  return null;
}

/** Describe the current trim in the form without presenting a valid selection as a warning. */
export function referenceVideoTrimFeedback(
  label: string,
  start: number | null,
  end: number | null,
  sourceDuration?: number,
): ReferenceVideoTrimFeedback {
  const source =
    sourceDuration !== undefined
      ? `${sourceDuration.toFixed(1)}s source. `
      : "";
  const error = referenceVideoTrimError(label, start, end, sourceDuration);
  if (error) {
    return { message: `${source}${error}.`, invalid: true };
  }
  if (start !== null && end !== null) {
    if (
      sourceDuration !== undefined &&
      sourceDuration > H3_REFERENCE_MAX_SECONDS &&
      start === 0 &&
      end === H3_REFERENCE_MAX_SECONDS
    ) {
      return {
        get message() { return translate("uxVideo.firstSSelectedAutomaticallyyjh41", { p1: source, p2: H3_REFERENCE_MAX_SECONDS.toFixed(1) }); },
        invalid: false,
      };
    }
    return {
      message: `${source}Selected ${start.toFixed(1)}s to ${end.toFixed(1)}s (${(
        end - start
      ).toFixed(1)}s).`,
      invalid: false,
    };
  }
  return {
    message: source
      ? translate("uxVideo.trimIsOptionalypwql", { p1: source })
      : translate("uxVideo.trimIsOptionalForisesc"),
    invalid: false,
  };
}
