// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import {
  WORKDIR_FILE_TOOLS,
  isWorkdirToolResult,
} from "@/components/assistant-ui/workdir-files";

import type { MessageRecord } from "../types";

/** Every workdir a chat's tool calls actually wrote to, read back from its history, newest first.
 *  Moving a chat between projects rewrites only its `projectId` while the files stay put, so a
 *  scope from current membership can name a folder this chat never used; the id recorded on a tool
 *  result is the one its files are under. A chat that ran tools on both sides of such a move names
 *  both, which is why this returns a list. Gated on the tool name and the full wrapper shape, as
 *  the adapter is: a custom or MCP tool with its own `sessionId` would name an unrelated folder. */
export function allRecordedWorkdirSessionIds(
  messages: MessageRecord[],
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const content = messages[index]?.content;
    if (!Array.isArray(content)) continue;
    for (let part = content.length - 1; part >= 0; part -= 1) {
      const entry = content[part] as {
        type?: unknown;
        toolName?: unknown;
        result?: unknown;
      } | null;
      if (entry?.type !== "tool-call") continue;
      if (
        typeof entry.toolName !== "string" ||
        !WORKDIR_FILE_TOOLS.has(entry.toolName)
      ) {
        continue;
      }
      const result: unknown = entry.result;
      if (!isWorkdirToolResult(result)) continue;
      if (result.sessionId.length === 0) continue;
      if (seen.has(result.sessionId)) continue;
      seen.add(result.sessionId);
      found.push(result.sessionId);
    }
  }
  return found;
}
