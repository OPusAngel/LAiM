// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Switch } from "@/components/ui/switch";
import { type OverlapValue, roformerOverlapLogic } from "../separate-policy";
import type { AudioToolPanel } from "./types";

export const roformerOverlapPanel: AudioToolPanel<OverlapValue> = {
  ...roformerOverlapLogic,
  Component: ({ value, onChange, disabled }) => (
    <div className="grid gap-1.5">
      <label
        htmlFor="separate-overlap"
        className="flex items-center justify-between gap-3 text-ui-13 font-medium text-foreground"
      >{translate("uxAudio.overlapSlowerCleanerosl2z")}<Switch
          id="separate-overlap"
          checked={value.overlap}
          disabled={disabled}
          onCheckedChange={(overlap) => onChange({ overlap })}
        />
      </label>
      <p className="text-ui-11p5 leading-snug text-muted-foreground">
        {translate("uxCopy.runsTheModelOvermrw6e")}
      </p>
    </div>
  ),
};

export const SEPARATE_TOOL_PANELS = [roformerOverlapPanel] as const;
