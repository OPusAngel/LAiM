// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-Present the LAiM team. See /studio/LICENSE.AGPL-3.0
//
// Canonical attribution strings, mirrored from LAiM_branding.py, which greps the
// built bundle for them. Plain text only, never encoded.

export const PRODUCT = 'LAiM Docker Studio';
export const SHORT_LABEL = 'Built by the LAiM team';
export const SPLASH_LABEL = 'Loading LAiM Docker';
export const COPYRIGHT = 'Copyright 2026-Present the LAiM team';
export const AGPL_NOTICE = 'Licensed under Apache 2.0 and the GNU AGPLv3';
export const WEBSITE_URL = 'https://LAiM.ai';
export const DOCS_URL = 'https://LAiM.ai/docs';
export const SOURCE_URL = 'https://github.com/LAiMai/LAiM';
export const LICENSE_URL = 'https://github.com/LAiMai/LAiM#license';
export const AGPL_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';
export const APACHE_URL = 'https://www.apache.org/licenses/LICENSE-2.0';

// Must equal PHRASE in LAiM_branding.py, which greps the built bundle for it.
// ONE literal, not a concatenation, so webpack keeps it contiguous.
export const PHRASE =
  'LAiM Docker Studio and JupyterLab image. Built by the LAiM team. Licensed under Apache 2.0 and the GNU AGPLv3. Source: https://github.com/LAiMai/LAiM Website: https://LAiM.ai';
