// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsAccountOwner } from "@/features/auth";
import { FolderBrowser } from "@/features/model-picker";
import { pickHuggingFaceCacheDir } from "@/features/native-intents";
import { isTauri } from "@/lib/api-base";
import { toast } from "@/lib/toast";
import { Folder02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { setDownloadDir, useDownloadDir } from "../download-manager";
import { type ScanFolderInfo, listScanFolders } from "../inventory/api";

const MODELS_FOLDER = "";
const PATH_SEPARATORS = /[\\/]+/;

function folderName(path: string): string {
  const parts = path.split(PATH_SEPARATORS).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function DownloadLocationPicker() {
  const isOwner = useIsAccountOwner();
  const dir = useDownloadDir();
  const [folders, setFolders] = useState<ScanFolderInfo[]>([]);
  const [browserOpen, setBrowserOpen] = useState(false);

  if (!isOwner) {
    return null;
  }

  const choose = async () => {
    if (!isTauri) {
      setBrowserOpen(true);
      return;
    }
    try {
      const path = await pickHuggingFaceCacheDir();
      if (path) {
        setDownloadDir(path);
      }
    } catch (error) {
      toast.error(translate("uxHub.couldnTOpenThe1olo0"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const options = folders.map((f) => f.path);
  if (dir && !options.includes(dir)) {
    options.unshift(dir);
  }
  const label = dir ? folderName(dir) : null;

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            listScanFolders()
              .then(setFolders)
              .catch(() => undefined);
          }
        }}
      >
        <DropdownMenuTrigger asChild={true}>
          <button
            type="button"
            aria-label={`Download to: ${dir ?? translate("uxHub.modelsFolder0q3lg")}`}
            title={`Download to: ${dir ?? translate("uxHub.modelsFolder0q3lg")}`}
            className="hub-tag-soft inline-flex h-[calc(26px*var(--ui-space-scale,1))] max-w-[calc(160px*var(--ui-space-scale,1))] min-w-0 cursor-pointer items-center gap-1 rounded-full border-0 px-2 text-ui-11 font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon
              icon={Folder02Icon}
              strokeWidth={1.75}
              className="size-3.5 shrink-0"
            />
            {dir ? <span className="truncate">{label}</span> : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-w-[calc(360px*var(--ui-space-scale,1))]"
        >
          <DropdownMenuLabel>{translate("uxHub.downloadTog4e7x")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={dir ?? MODELS_FOLDER}
            onValueChange={(value) => setDownloadDir(value || null)}
          >
            <DropdownMenuRadioItem value={MODELS_FOLDER}>
              {translate("settings.general.storage.modelsFolder")}
            </DropdownMenuRadioItem>
            {options.map((path) => (
              <DropdownMenuRadioItem key={path} value={path} title={path}>
                <span className="truncate font-mono text-xs">{path}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              choose().catch(() => undefined);
            }}
          >{translate("uxHub.chooseFoldernt07a")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FolderBrowser
        open={!isTauri && browserOpen}
        onOpenChange={setBrowserOpen}
        onSelect={(path) => setDownloadDir(path)}
        initialPath={dir ?? undefined}
        title={translate("uxHub.chooseDownloadFoldero3n91")}
        confirmLabel={translate("uxHub.downloadHere8lqhs")}
        showModelHints={false}
      />
    </>
  );
}
