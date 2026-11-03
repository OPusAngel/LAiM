// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStopRunningChatsDialogStore } from "../stores/stop-running-chats-dialog-store";

/** Confirmation for applying a model or reload-required setting while chats are generating. They
 *  share one llama-server, so the swap ends all of them: name them and make the user opt in
 *  rather than truncating silently. */
export function StopRunningChatsDialog() {
  const open = useStopRunningChatsDialogStore((s) => s.open);
  const count = useStopRunningChatsDialogStore((s) => s.count);
  const titles = useStopRunningChatsDialogStore((s) => s.titles);
  const action = useStopRunningChatsDialogStore((s) => s.action);
  const hasNonChat = useStopRunningChatsDialogStore((s) => s.hasNonChat);
  const effect = useStopRunningChatsDialogStore((s) => s.effect);
  const resolve = useStopRunningChatsDialogStore((s) => s.resolve);

  // Embeddings, raw completions and audio share the model but are not conversations, so name them
  // generically rather than offering to stop chats that do not exist.
  const noun = hasNonChat
    ? count === 1
      ? "request"
      : "requests"
    : count === 1
      ? "chat"
      : "chats";
  const sharer = hasNonChat ? "request" : "conversation";
  // Ejecting leaves no model loaded. Saying it "reloads the model" and offering "Stop and reload"
  // promised the opposite of what confirming does, for the destructive one.
  const unloads = effect === "unload";
  const lead = unloads
    ? `${action || translate("uxChat.unloadingTheModelxfnf5")} leaves no model loaded, and every open ${sharer} shares it, `
    : `${action ? `${action} reloads the model, ` : translate("uxChat.reloadingTheModelt8imp")}which every open ${sharer} shares, `;
  const shown = titles.slice(0, 5);
  const remaining = Math.max(0, titles.length - shown.length);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Escape / overlay click must resolve, or the caller's await hangs.
        if (!next) resolve(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translate("uxChat.stopRunningoyqeb", { p1: count, p2: noun })}</AlertDialogTitle>
          <AlertDialogDescription>{translate("uxChat.soWillStopWorksqe9v", { p1: lead, p2: count === 1 ? "this" : "these", p3: noun, p4: hasNonChat ? "" : " generating" })}</AlertDialogDescription>
        </AlertDialogHeader>
        {shown.length > 0 && (
          <ul className="max-h-40 overflow-y-auto scroll-rounded rounded-md border bg-muted/40 px-3 py-2 text-sm">
            {shown.map((title) => (
              <li key={title} className="truncate py-0.5">
                {title}
              </li>
            ))}
            {remaining > 0 && (
              <li className="py-0.5 text-muted-foreground">{translate("uxChat.andMore3puoi", { p1: remaining })}</li>
            )}
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => resolve(false)}>
            {translate("uxChat.keepGenerating1moc6")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => resolve(true)}>
            {unloads ? translate("uxChat.stopAndUnload5tr8w") : translate("uxChat.stopAndReload13bgg")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
