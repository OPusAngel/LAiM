// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

/**
 * LAiM's own release number, shown in Settings > About beside the desktop build it was packaged
 * from. Bump it together with `version` in studio/src-tauri/Cargo.toml: both read 1.0.0 for the
 * first release. It is deliberately not the Python package's version -- that one tracks the
 * training/inference library inside LAiM and its numbers are theirs, not the app's.
 */
export const LAiM_RELEASE_VERSION = "1.0.0";
