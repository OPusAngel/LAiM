// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { Saturn01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/** Two agent cores, one family: the same planet, with and without its ring. */

// Hugeicons "Saturn 01" (stroke-rounded): the planet body drawn in the arcs a ring leaves
// visible, plus the ring itself.
const SaturnRingedIcon: IconSvgElement = Saturn01Icon;

// The same planet with no ring: the body whole, and one belt so it reads as a planet rather
// than a plain circle. Radius and centre match Saturn 01, so the two glyphs sit alike side by side.
const PlanetIcon: IconSvgElement = [
  [
    "path",
    {
      d: "M12 3C16.9706 3 21 7.0294 21 12C21 16.9706 16.9706 21 12 21C7.0294 21 3 16.9706 3 12C3 7.0294 7.0294 3 12 3Z",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "0",
    },
  ],
  [
    "path",
    {
      d: "M4.3 13.9C7 12.6 9.6 12 12 12C14.4 12 17 12.6 19.7 13.9",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "1",
    },
  ],
];

function glyph(icon: IconSvgElement) {
  return function AgentCoreGlyph({
    className,
    strokeWidth,
  }: {
    className?: string;
    strokeWidth?: number;
  }) {
    return <HugeiconsIcon icon={icon} className={className} strokeWidth={strokeWidth} />;
  };
}

/** «Ядро агента» — the planet on its own. */
export const PlanetCoreGlyph = glyph(PlanetIcon);

/** «Ядро полного агента» — the same planet with its ring. */
export const SaturnCoreGlyph = glyph(SaturnRingedIcon);
