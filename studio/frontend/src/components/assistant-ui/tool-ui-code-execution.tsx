// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";

"use client";

import { FileGlyph } from "@/lib/file-icon";
import { stringifyToolResult } from "@/lib/strip-ansi";
import {
  type ToolCallMessagePartComponent,
  useAuiState,
} from "@assistant-ui/react";
import { partsHaveNonEmptyText } from "@/components/assistant-ui/message-derived";
import { TerminalIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { isToolCallRunning, toolArgText } from "./tool-arg-text";
import { type ComponentType, memo, useMemo } from "react";
import { useToolAwaitingApproval } from "@/features/chat";
import {
  ToolFallbackContent,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from "./tool-fallback";
import { useToolActivityOpen } from "./use-tool-activity-open";
import { ScrollPane } from "./scroll-pane";
import { CopyBtn } from "./tool-code-cell";

/**
 * Renders synthetic `_toolEvent` chunks from `_stream_anthropic` for the
 * `code_execution_20250825` tool. The backend collapses Anthropic's two
 * sub-tools into `tool_name: "code_execution"` with `arguments.kind`:
 *
 *   kind=bash:        { command: "<shell command>" }
 *   kind=text_editor: { command: "view"|"create"|"str_replace", path, ... }
 *
 * The `result` payload is preformatted text:
 *   - bash: stdout, then "--- stderr ---" block + return_code if non-zero
 *   - text_editor view:        file contents verbatim
 *   - text_editor create:      "Created <path>" / "Updated <path>"
 *   - text_editor str_replace: unified-diff `lines` joined with "\n"
 *   - error:                   "Error: <error_code>"
 */
interface CodeExecutionArgs {
  kind?: "bash" | "text_editor";
  // Straight off the wire: the model, not the schema, decides the JSON type.
  command?: unknown;
  path?: unknown;
}

const MAX_COMMAND_LABEL = 80;
const MAX_RESULT_DISPLAY = 10_000;

function truncateCommandLabel(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_COMMAND_LABEL) {
    return normalized;
  }
  const head = Math.ceil((MAX_COMMAND_LABEL - 3) * 0.65);
  const tail = MAX_COMMAND_LABEL - head - 3;
  return `${normalized.slice(0, head)}...${normalized.slice(-tail)}`;
}

function truncateResult(text: string): string {
  return text.length <= MAX_RESULT_DISPLAY
    ? text
    : `${text.slice(0, MAX_RESULT_DISPLAY)}\n... (truncated)`;
}

export function CodeExecutionResultOutput({ result }: { result: unknown }) {
  const resultText = useMemo(
    () => (result == null ? "" : stringifyToolResult(result)),
    [result],
  );
  const displayedResult = useMemo(
    () => truncateResult(resultText),
    [resultText],
  );

  if (!resultText) {
    return null;
  }
  return (
    <div>
      <div className="flex justify-end">
        <CopyBtn text={resultText} />
      </div>
      <ScrollPane
        className="mt-1 rounded bg-muted/50 p-2"
        scrollerClassName="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs"
      >
        {displayedResult}
      </ScrollPane>
    </div>
  );
}



const CodeExecutionToolUIImpl: ToolCallMessagePartComponent = ({
  args,
  result,
  status,
  toolCallId,
}) => {
  const parsedArgs = (args as CodeExecutionArgs) ?? {};
  const kind = parsedArgs.kind ?? "bash";
  const command = toolArgText(parsedArgs.command);
  const path = toolArgText(parsedArgs.path);
  const isRunning = isToolCallRunning(status);

  const commandLabel = command ? truncateCommandLabel(command) : "";

  let runningLabel: string;
  let completedLabel: string;
  let Icon: ComponentType<{ className?: string }> = TerminalIcon;
  if (kind === "text_editor") {
    Icon = FileGlyph;
    if (command === "view") {
      runningLabel = path ? translate("uxComponents.viewingPathdvrnt", { p1: path }) : translate("uxComponents.viewingFilebwe5k");
      completedLabel = path ? translate("uxComponents.viewedPathcutgu", { p1: path }) : translate("uxComponents.viewedFilecx59r");
    } else if (command === "create") {
      runningLabel = path ? translate("uxComponents.writingPathnr49o", { p1: path }) : translate("uxComponents.writingFile66lfh");
      completedLabel = path ? translate("uxComponents.wrotePathy7q3d", { p1: path }) : translate("uxComponents.wroteFileyhcwo");
    } else if (command === "str_replace") {
      runningLabel = path ? translate("uxComponents.editingPathmq23c", { p1: path }) : translate("uxComponents.editingFile58cah");
      completedLabel = path ? translate("uxComponents.editedPathsekov", { p1: path }) : translate("uxComponents.editedFilet0cfy");
    } else {
      runningLabel = translate("uxComponents.runningFileOperation9ph07");
      completedLabel = translate("uxComponents.fileOperationqsb2u");
    }
  } else {
    runningLabel = translate("uxComponents.runningCommandtbtkz");
    completedLabel = commandLabel ? translate("uxComponents.ranCommandLabelaumlb", { p1: commandLabel }) : translate("uxComponents.ranCommand2gftr");
  }

  // Collapse the card once the model resumes streaming prose after the tool
  // call (mirrors WebSearchToolUI) so it doesn't crowd the final answer.
  const hasText = useAuiState(({ message }) =>
    partsHaveNonEmptyText(message.content),
  );
  // Ask permission gates every local tool call, and what is being approved
  // lives inside the content while Allow/Deny render outside it.
  const awaitingApproval = useToolAwaitingApproval(toolCallId);
  const [open, setOpen] = useToolActivityOpen(isRunning, hasText);

  return (
    <ToolFallbackRoot
      open={open}
      onOpenChange={setOpen}
      awaitingApproval={awaitingApproval}
    >
      <ToolFallbackTrigger
        toolName={isRunning ? runningLabel : completedLabel}
        status={status}
        icon={Icon}
      />
      <ToolFallbackContent>
        {isRunning ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-3.5" />
            <span>{runningLabel}</span>
          </div>
        ) : (
          <CodeExecutionResultOutput result={result} />
        )}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

export const CodeExecutionToolUI = memo(
  CodeExecutionToolUIImpl,
) as unknown as ToolCallMessagePartComponent;
CodeExecutionToolUI.displayName = "CodeExecutionToolUI";
