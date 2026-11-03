// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { toast } from "sonner";
import { deleteStoredChatThreads } from "./chat-history-storage";

/** Offer to delete workdir files a delete kept. Once the chats are gone there is no card left to
 *  reach those folders from, so every delete surface that cannot ask up front offers here. */
export function offerToDeleteKeptWorkdirs(keptThreadIds: string[]): void {
  if (keptThreadIds.length === 0) return;
  toast(
    keptThreadIds.length === 1
      ? translate("uxChat.filesFromThisChathtbxr")
      : translate("uxChat.filesFromChatsWereizcat", { p1: keptThreadIds.length }),
    {
      description:
        keptThreadIds.length === 1
          ? translate("uxChat.itsWorkdirFolderIsi2jm6")
          : translate("uxChat.theirWorkdirFoldersAreonc6v"),
      action: {
        label: translate("uxChat.deleteFilesydxm4"),
        onClick: () => {
          void deleteStoredChatThreads(keptThreadIds, { deleteFiles: true })
            .then((stillKept) => {
              // A tool still running in there, a surviving fork, or a folder that would not go: the request
              // succeeded and the files did not, so this offer is the only way back to them.
              if (stillKept.length > 0) offerToDeleteKeptWorkdirs(stillKept);
            })
            .catch(() => {
              toast.error(translate("uxChat.couldNotDeleteThe17yvt"));
            });
        },
      },
    },
  );
}
