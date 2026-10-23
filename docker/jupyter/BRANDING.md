# LAiM Docker Studio branding

The LAiM Docker Studio and JupyterLab image ships LAiM attribution across
several files. Preserving it is a license condition, not just a build check. See
[../NOTICE](../NOTICE) and [/studio/LICENSE.AGPL-3.0](../../studio/LICENSE.AGPL-3.0).

## What must stay

- `Built by the LAiM team` (login page and the labextension).
- `Copyright 2026-Present the LAiM team`.
- `Licensed under Apache 2.0 and the GNU AGPLv3`.
- The LAiM logo and the `LAiM Dark` theme in the top bar and on the splash.
- The Help > About dialog with the Source, Website, License, AGPLv3 and Apache
  links.

The canonical strings live in `LAiM_branding.py` and its TypeScript mirror
`LAiM_labext/src/branding.ts`. The `PHRASE` literal must be byte-identical
between the two, because the guard greps the built labextension bundle for it.

## Where it lives

| File | Carries |
| --- | --- |
| `login.html` | JupyterLab login page and attribution line. |
| `LAiM_labext/src/branding.ts` | Canonical attribution strings (TS mirror). |
| `LAiM_labext/src/about.ts` | Help > About dialog and the license links. |
| `LAiM_labext/src/splash.ts` | Loading-splash caption. |
| `LAiM_labext/src/logo.ts` | Embedded LAiM logo data URI. |
| `LAiM_branding.py` | Canonical strings and the integrity guard. |

## How it is enforced

`LAiM_branding.py` verifies the attribution is present and unaltered in three
places (see [../Dockerfile.studio](../Dockerfile.studio) and
[../studio_launch.sh](../studio_launch.sh)):

1. **Build time:** `python -m LAiM_branding --verify` fails the image build if
   any attribution asset is missing or altered.
2. **Whole image:** `studio_launch.sh` re-runs the same check before starting
   supervisord; a failure refuses to start the container.
3. **JupyterLab:** the module is also a `jupyter_server` extension that re-checks
   on load and refuses to serve JupyterLab if attribution was stripped after the
   container started.

The guard is a tripwire, not a lock. Anyone who forks the source controls the
build and can edit any of these files. It exists to make accidental removal fail
loudly and to make deliberate removal unambiguous. The attribution is protected
by the AGPLv3 as an Appropriate Legal Notice (see [../NOTICE](../NOTICE)), and
removing it before conveying or network-serving the image is a license
violation.
