// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  Download01Icon,
  FileEmpty02Icon,
  FolderOpenIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { authFetch, getAuthToken } from "@/features/auth";
import { apiUrl, isTauri } from "@/lib/api-base";
import { downloadUrlStreaming, isDownloadCancelled } from "@/lib/native-files";
import { cn } from "@/lib/utils";

import { FileContextMenu, loadWorkdirFile } from "./link-context-menu";
import { workdirFilePath, type WorkdirFile } from "./workdir-files";
import { revealWorkdir } from "./workdir-reveal";

function formatSize(size: number | null): string {
  if (size === null || size === undefined || Number.isNaN(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function WorkdirFileRow({
  sessionId,
  file,
}: {
  sessionId: string;
  file: WorkdirFile;
}) {
  const [busy, setBusy] = useState(false);

  // Streamed to the chosen path rather than buffered: a tool can write a
  // multi-gigabyte artifact, and a Blob plus its IPC copy would be two more of
  // it in the renderer. The bearer goes in the query: no headers are sent.
  const save = useCallback(async () => {
    setBusy(true);
    try {
      const path = workdirFilePath(sessionId, file.name);
      // The bearer rides in the URL, so nothing refreshes it: an expired
      // access token would save a 401 body under the file's name. authFetch
      // refreshes and retries, and the HEAD settles that the file is there.
      const probe = await authFetch(apiUrl(path), { method: "HEAD" });
      if (!probe.ok) throw new Error(translate("uxComponents.downloadRefusedkvkuw", { p1: probe.status }));
      const token = getAuthToken();
      const separator = path.includes("?") ? "&" : "?";
      // Absolute: the native command parses this and rejects a relative URL,
      // so a bare /api path failed before the request was made.
      const url = apiUrl(
        token ? `${path}${separator}token=${encodeURIComponent(token)}` : path,
      );
      await downloadUrlStreaming(url, file.name);
    } catch (error) {
      if (!isDownloadCancelled(error)) {
        toast.error(translate("uxComponents.couldNotSavedlj7g", { p1: file.name }));
      }
    } finally {
      setBusy(false);
    }
  }, [file.name, sessionId]);

  return (
    <FileContextMenu
      file={{
        name: file.name.slice(file.name.lastIndexOf("/") + 1),
        load: () => loadWorkdirFile(sessionId, file.name),
        open: () => void save(),
        workdir: { sessionId, file: file.name },
      }}
    >
      <button
        type="button"
        onClick={save}
        disabled={busy}
        title={translate("uxComponents.save7ci5e", { p1: file.name })}
        className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-60"
      >
        <HugeiconsIcon icon={FileEmpty02Icon} className="size-3.5 shrink-0" />
        <span className="truncate font-mono">{file.name}</span>
        {file.size !== null && (
          <span className="text-muted-foreground">{formatSize(file.size)}</span>
        )}
        <HugeiconsIcon icon={Download01Icon} className="size-3.5 shrink-0" />
      </button>
    </FileContextMenu>
  );
}

/**
 * The row's heading, doubling as the way into the folder itself on desktop.
 * The backend opens the file manager, so in a browser it stays plain text and
 * says why.
 */
function WorkdirFolderLabel({
  sessionId,
  label,
}: {
  sessionId: string;
  label: string;
}) {
  const open = useCallback(() => {
    revealWorkdir(sessionId).catch(() => {
      toast.error(translate("library.chats.folder.chatFailed"));
    });
  }, [sessionId]);

  if (!isTauri) {
    return (
      <span
        className="text-xs font-medium text-muted-foreground"
        title={translate("uxComponents.openingTheFolderNeedsfsrbn")}
      >
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={open}
      title={translate("uxComponents.openTheFolderThesetimyr")}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <HugeiconsIcon icon={FolderOpenIcon} className="size-3.5 shrink-0" />
      {label}
    </button>
  );
}

/**
 * "Files created" row under a tool card. Without it the only trace of a written
 * file was the model mentioning it in prose.
 */
export function WorkdirFiles({
  sessionId,
  files,
  className,
}: {
  sessionId: string;
  files: WorkdirFile[];
  className?: string;
}) {
  if (!sessionId || files.length === 0) return null;
  return (
    // No divider: the row sits outside the collapsible content, so on a collapsed card a rule
    // would separate the header from nothing.
    <div className={cn("mt-2", className)}>
      <WorkdirFolderLabel
        sessionId={sessionId}
        label={files.length === 1 ? "file created" : "files created"}
      />
      <div className="mt-1 flex flex-wrap gap-1.5">
        {files.map((file) => (
          <WorkdirFileRow key={file.name} sessionId={sessionId} file={file} />
        ))}
      </div>
    </div>
  );
}
