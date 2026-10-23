// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// Apply the stored theme and palette before the bundle loads so the first paint is never the wrong
// mode. Loaded as an external classic script (it blocks parsing, like an inline script) because the
// backend CSP only allows script-src 'self'.
try {
  // Storage reads get their own guards so a blocked localStorage (private
  // browsing) still resolves a mode from the OS preference.
  var theme = "dark";
  var palette = null;
  try {
    // LAiM ships dark as the default theme; an explicit choice still wins.
    theme = localStorage.getItem("LAiM_theme_v2") || "dark";
    palette = localStorage.getItem("LAiM_palette_v2");
  } catch (e) {}
  var dark =
    theme === "dark" ||
    (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  // Keep in sync with COLOR_THEME_IDS ("standard" sets no attribute).
  var palettes = [
    "classic", "minimal", "blueberry", "butterfly-pea", "cherry",
    "cinnamon", "cotton-candy", "dragon-fruit", "earl-grey", "espresso",
    "honey", "licorice", "macaron", "matcha", "mint", "neon-cyberpunk",
    "oat-milk", "peach", "pina-paraiso", "plum", "tangerine", "taro",
    "wasabi", "yuzu",
  ];
  if (palettes.indexOf(palette) !== -1) {
    root.setAttribute("data-palette", palette);
  }
} catch (e) {}
