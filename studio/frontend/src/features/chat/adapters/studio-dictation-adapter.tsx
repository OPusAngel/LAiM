// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { requestSttDownload } from "@/features/settings/stores/stt-download-prompt-store";
import {
  type DictationEngine,
  sttModelVariant,
  useVoiceSettingsStore,
} from "@/features/settings/stores/voice-settings-store";
import { toast } from "@/lib/toast";
import type { DictationAdapter } from "@assistant-ui/react";
import { useExternalProvidersStore } from "../stores/external-providers-store";
import {
  currentDictationEntryMode,
  insecureDictationGuidance,
} from "../utils/dictation-entry";
import {
  StudioModelDictationAdapter,
  fetchSttStatus,
  sttEngineStatusFor,
  sttQuantDownloaded,
} from "./studio-model-dictation-adapter";
import {
  type StudioDictationSession,
  StudioWebSpeechDictationAdapter,
} from "./studio-web-speech-dictation-adapter";

// one live session lets Escape cancel because assistant-ui only exposes stop, which transcribes.
let activeSession: StudioDictationSession | null = null;

/** discards the active dictation without transcribing; safe when idle. */
export function cancelActiveStudioDictation(): void {
  const session = activeSession;
  activeSession = null;
  session?.cancel();
}

/** Routes dictation to the engine chosen in Voice settings, resolved at listen() time so
 *  switching engines applies without reloading the chat runtime. */
/** local and custom transcription record through the media recorder. */
function usesRecordedAudio(dictationEngine: DictationEngine): boolean {
  return dictationEngine !== "browser";
}

function customSttConfigured(): boolean {
  const { sttProviderId, sttProviderModel } = useVoiceSettingsStore.getState();
  const { connectionsEnabled, providers } =
    useExternalProvidersStore.getState();
  const providerId = sttProviderId.trim();
  return Boolean(
    connectionsEnabled &&
    providerId &&
    sttProviderModel.trim() &&
    providers.some((provider) => provider.id === providerId),
  );
}

export class StudioDictationAdapter implements DictationAdapter {
  // Chat linked in Recent dictations. undefined follows the active single chat; null records no
  // chat (composers outside it, e.g. Compare).
  private readonly chatId: string | null | undefined;

  constructor(options: { chatId?: string | null } = {}) {
    this.chatId = options.chatId;
  }

  static isSupported(
    dictationEngine: DictationEngine = useVoiceSettingsStore.getState()
      .dictationEngine,
  ): boolean {
    if (dictationEngine === "custom" && !customSttConfigured()) {
      return false;
    }
    return usesRecordedAudio(dictationEngine)
      ? StudioModelDictationAdapter.isSupported()
      : StudioWebSpeechDictationAdapter.isSupported();
  }

  listen(): StudioDictationSession {
    const session = this.createSession();
    // A second entry point (chat, Compare, settings test) replaces the active session; cancel the
    // old one so it cannot keep the mic open or save a transcript with no discard button.
    cancelActiveStudioDictation();
    activeSession = session;
    // Forget the session once it ends so a later cancel is a no-op.
    const clear = () => {
      if (activeSession === session) {
        activeSession = null;
      }
    };
    session.onSpeechEnd(clear);
    session.onEnd?.(clear);
    return session;
  }

  private createSession(): StudioDictationSession {
    const { dictationEngine } = useVoiceSettingsStore.getState();
    if (usesRecordedAudio(dictationEngine)) {
      if (dictationEngine === "custom" && !customSttConfigured()) {
        throw new Error(
          translate("uxChat.customTranscriptionIsNotqkera"),
        );
      }
      if (StudioModelDictationAdapter.isSupported()) {
        return new StudioModelDictationAdapter({
          chatId: this.chatId,
        }).listen();
      }
      throw new Error(
        dictationEngine === "custom"
          ? translate("uxChat.voiceRecordingIsNotwkgfo")
          : translate("uxChat.localModelDictationIs08g4n"),
      );
    }
    if (StudioWebSpeechDictationAdapter.isSupported()) {
      return new StudioWebSpeechDictationAdapter({
        chatId: this.chatId,
      }).listen();
    }
    throw new Error(translate("uxChat.browserDictationIsNotsyz11"));
  }
}

/** Whether dictation can run now for the chosen engine. */
export function isStudioDictationAvailable(
  dictationEngine: DictationEngine = useVoiceSettingsStore.getState()
    .dictationEngine,
): boolean {
  return StudioDictationAdapter.isSupported(dictationEngine);
}

/** Explain why dictation can't start and point the user to the local model. */
export function notifyStudioDictationUnavailable(
  dictationEngine: DictationEngine = useVoiceSettingsStore.getState()
    .dictationEngine,
): void {
  // Both engines need a secure context (localhost or HTTPS).
  if (typeof window !== "undefined" && !window.isSecureContext) {
    toast.error(translate("uxChat.voiceTypingNeedsA1f7ip"), {
      description: insecureDictationGuidance(currentDictationEntryMode()),
    });
    return;
  }
  if (dictationEngine === "custom" && !customSttConfigured()) {
    toast.error(translate("uxChat.customTranscriptionIsnT14l5g"), {
      description: translate("uxChat.pickAConnectionAnddhhsb"),
    });
    return;
  }
  if (usesRecordedAudio(dictationEngine)) {
    toast.error(translate("uxChat.voiceRecordingIsnT19i6b"));
    return;
  }
  // Firefox lacks Web Speech, so offer local dictation.
  void offerLocalDictation();
}

/** offers local dictation when Web Speech is missing, prompting before a needed download. */
async function offerLocalDictation(): Promise<void> {
  const { sttModel, sttGgufVariant, setDictationEngine } =
    useVoiceSettingsStore.getState();
  const ggufVariant = sttModelVariant(sttModel, sttGgufVariant);
  try {
    const status = await fetchSttStatus(undefined, sttModel);
    const engine = sttEngineStatusFor(status, sttModel);
    // avoid offering a large download when the runtime cannot load it.
    if (engine && !engine.available) {
      toast.error(translate("uxChat.localTranscriptionIsnTvqbyg"), {
        get description() { return translate("uxChat.runLAiMStudioUpdate3yll1"); },
      });
      return;
    }
    if (
      engine?.downloaded_models.includes(sttModel) &&
      (await sttQuantDownloaded(sttModel, ggufVariant))
    ) {
      setDictationEngine("model");
      toast.success(translate("uxChat.switchedToLocalTranscriptioncvm5e"), {
        description:
          translate("uxChat.voiceTypingIsnT1wm38"),
      });
      return;
    }
  } catch {
    // the download path reports status or quant lookup failures.
  }
  requestSttDownload(sttModel, { selectLocalEngine: true, ggufVariant });
}
