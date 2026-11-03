// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { SegmentedPill } from "@/components/segmented-control";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { translate } from "@/i18n";
import { useId } from "react";

// The Hub shows one option: the downloader picks the best transport itself.
// The install-wide HTTP/Xet choice lives in Settings > General.
export function TransportToggle() {
  const pillId = useId();
  return (
    <fieldset
      aria-label={translate("settings.general.downloads.transport")}
      className="hub-tag-soft isolate m-0 inline-flex h-[calc(26px*var(--ui-space-scale,1))] min-w-0 items-center gap-0.5 rounded-full border-0 p-0.5 text-ui-11"
    >
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <span className="relative inline-flex h-[calc(22px*var(--ui-space-scale,1))] cursor-default items-center justify-center rounded-full px-2 font-medium tracking-tight text-foreground">
            <SegmentedPill group={`${pillId}-transport`} />
            {translate("settings.appearance.custom.sentAttachments.auto")}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="tooltip-compact"
        >
          {translate("settings.general.downloads.autoHint")}
        </TooltipContent>
      </Tooltip>
    </fieldset>
  );
}
