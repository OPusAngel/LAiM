// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_SESSION_ENDING_EVENT } from "@/features/auth";
import { useVoiceSettingsStore } from "@/features/settings";
import { isTauri } from "@/lib/api-base";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "@/lib/toast";
import { AudioApiError } from "../api";
import { type AudioSourceSelection, sourceRefOf } from "../audio-run-request";
import { sttSameModel } from "../audio-page-policy";
import { sttRepoIdForSidecarKey, sttSidecarKeyFor } from "../catalog";
import {
  getTranscript,
  renameTranscriptSpeakers,
  transcribeSourceWithProgress,
} from "../transcribe-api";
import { downloadTranscript } from "../transcript-download";
import type { TranscriptExportFormat } from "../transcript-export";
import {
  readTranscriptDraft,
  transcriptDraftKey,
  writeTranscriptDraft,
} from "../transcript-draft";
import {
  EMPTY_TRANSCRIPT_DETAILS,
  type TranscriptDetails,
  detailsFrom,
} from "../transcript-model";
import type {
  TranscriptProgress,
  TranscriptRecord,
} from "../transcript-stream";
import type { AudioHostState } from "./audio-host-state";
import type { SttSidecar } from "./use-stt-sidecar";

function withName(
  names: Record<string, string>,
  id: string,
  name: string | undefined,
): Record<string, string> {
  const next = { ...names };
  if (name) next[id] = name;
  else delete next[id];
  return next;
}

function toastFailure(what: string, error: unknown) {
  toast.error(
    error instanceof Error && error.message
      ? `${what}: ${error.message}`
      : `${what}.`,
  );
}

export function useTranscription({
  activeRef,
  busyRef,
  setBusy,
  lastSttRepo,
  selectedSttRepoRef,
  setSelectedSttRepo,
  sttLoadedModel,
  sttLoadedEngine,
  ensureSttLoaded,
  setLastSttRepo,
  refreshSttStatus,
  sttEngineFor,
  readSttResidency,
  sttLoadGeneration,
}: Pick<AudioHostState, "activeRef" | "busyRef" | "setBusy"> &
  Pick<
    SttSidecar,
    | "lastSttRepo"
    | "selectedSttRepoRef"
    | "setSelectedSttRepo"
    | "sttLoadedModel"
    | "sttLoadedEngine"
    | "ensureSttLoaded"
    | "setLastSttRepo"
    | "refreshSttStatus"
    | "sttEngineFor"
    | "readSttResidency"
    | "sttLoadGeneration"
  >) {
  const [draftKey] = useState(transcriptDraftKey);
  const [recoveredTranscript] = useState(() => readTranscriptDraft(draftKey));
  const [transcript, setTranscript] = useState(recoveredTranscript?.text ?? "");
  const [transcribedName, setTranscribedName] = useState<string | null>(recoveredTranscript?.title ?? null);
  const [transcriptModel, setTranscriptModel] = useState(recoveredTranscript?.model ?? "");
  const [transcriptDetails, setTranscriptDetails] = useState<TranscriptDetails>(
    () => recoveredTranscript?.details ?? EMPTY_TRANSCRIPT_DETAILS,
  );
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>(
    () => recoveredTranscript?.speakerNames ?? {},
  );
  const [transcriptRecord, setTranscriptRecord] = useState<TranscriptRecord | null>(null);
  const [transcriptExported, setTranscriptExported] = useState(false);
  const transcriptVersion = useRef(0);
  const [transcriptionStartedAt, setTranscriptionStartedAt] = useState<number | null>(null);
  const [transcriptionFinishedAt, setTranscriptionFinishedAt] = useState<number | null>(null);
  const [transcriptionStopping, setTranscriptionStopping] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptProgress | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const transcriptionAbort = useRef<AbortController | null>(null);

  const clearTranscript = useCallback(() => {
    transcriptVersion.current += 1;
    setTranscript("");
    setTranscribedName(null);
    setTranscriptError(null);
    setTranscriptModel("");
    setTranscriptRecord(null);
    setTranscriptExported(false);
    setTranscriptDetails(EMPTY_TRANSCRIPT_DETAILS);
    setSpeakerNames({});
  }, []);

  const confirmTranscriptReplacement = useCallback(() => {
    if (busyRef.current !== null) return false;
    return (
      !transcript ||
      transcriptRecord !== null ||
      transcriptExported ||
      window.confirm(
        translate("uxAudio.thisTranscriptCouldNotwcjzl"),
      )
    );
  }, [transcript, transcriptRecord, transcriptExported]);

  useEffect(() => {
    const unsaved = Boolean(
      transcript && transcriptRecord === null && !transcriptExported,
    );
    if (!writeTranscriptDraft(
      draftKey,
      unsaved ? {
        text: transcript,
        title: transcribedName ?? "Transcript",
        model: transcriptModel,
        details: transcriptDetails,
        speakerNames,
      } : null,
    )) {
      toast.error(translate("uxAudio.couldNotUpdateTranscript15o9s"));
    }
    if (isTauri) {
      void import("@tauri-apps/api/core")
        .then(({ invoke }) =>
          invoke("set_renderer_activity", {
            kind: "unsaved_transcript",
            active: unsaved,
          }),
        )
        .catch(() =>
          toast.error(translate("uxAudio.couldNotUpdateTranscriptibjsu")),
        );
    }
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLogout = (event: Event) => {
      if (
        !window.confirm(
          translate("uxAudio.thisTranscriptCouldNotd2bdp"),
        )
      ) {
        event.preventDefault();
      } else if (!writeTranscriptDraft(draftKey, null)) {
        event.preventDefault();
        toast.error(translate("uxAudio.couldNotDiscardThe11kge"));
      }
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener(AUTH_SESSION_ENDING_EVENT, confirmLogout);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener(AUTH_SESSION_ENDING_EVENT, confirmLogout);
    };
  }, [draftKey, transcript, transcribedName, transcriptModel, transcriptRecord, transcriptExported, transcriptDetails, speakerNames]);

  const prepareTranscriptionModel = useCallback(async () => {
    const repo = selectedSttRepoRef.current ?? lastSttRepo;
    if (!repo) {
      toast.info(translate("uxAudio.pickASpeechTo1tv3v"));
      return null;
    }
    selectedSttRepoRef.current = repo;
    setSelectedSttRepo(repo);
    const model = sttSidecarKeyFor(repo);
    const engine = sttEngineFor(repo);
    // An Eject or another pick during the read below bumps this.
    const generation = sttLoadGeneration.current;
    // Page state lags an idle unload; transcribing against it skipped the load and hit a 409.
    const resident = await readSttResidency(engine).catch(() =>
      sttLoadedModel && sttLoadedEngine
        ? { model: sttLoadedModel, engine: sttLoadedEngine }
        : null,
    );
    // Nothing is busy during that read, so an Eject, a pick or leaving the page meanwhile wins; a
    // status refresh that cleared the selection (nothing resident yet) does not.
    if (sttLoadGeneration.current !== generation || !activeRef.current) return null;
    const current = selectedSttRepoRef.current;
    if (current !== null && current !== repo) return null;
    if (current === null) {
      selectedSttRepoRef.current = repo;
      setSelectedSttRepo(repo);
    }
    if (
      !resident ||
      resident.engine !== engine ||
      !sttSameModel(
        repo,
        resident.model,
        sttSidecarKeyFor,
        engine,
        sttRepoIdForSidecarKey,
      )
    ) {
      if (!(await ensureSttLoaded(repo, model, engine))) return null;
    }
    setLastSttRepo(repo);
    return { model, engine };
  }, [
    lastSttRepo,
    sttLoadedModel,
    sttLoadedEngine,
    sttEngineFor,
    readSttResidency,
    ensureSttLoaded,
    setLastSttRepo,
  ]);

  const runTranscription = useCallback(
    async (
      source: AudioSourceSelection,
      options: { language: string; timestamps: boolean; speakers: boolean },
      onSourceExpired?: () => void,
      confirmedVersion?: number,
    ) => {
      if (
        transcriptionAbort.current ||
        busyRef.current !== null ||
        (confirmedVersion !== transcriptVersion.current &&
          !confirmTranscriptReplacement())
      ) return;
      let started = false;
      const controller = new AbortController();
      transcriptionAbort.current = controller;
      try {
        const target = await prepareTranscriptionModel();
        if (!target || controller.signal.aborted || !activeRef.current) return;
        setBusy("transcribing");
        clearTranscript();
        setTranscribedName(source.name);
        setTranscriptModel(target.model);
        started = true;
        setTranscriptionStartedAt(Date.now());
        setTranscriptionFinishedAt(null);
        setTranscriptionStopping(false);
        setTranscriptionProgress(null);
        const result = await transcribeSourceWithProgress(
          sourceRefOf(source),
          source.name,
          {
            ...target,
            device: useVoiceSettingsStore.getState().sttDevice,
            ...options,
            signal: controller.signal,
          },
          (progress) => {
            if (!controller.signal.aborted) setTranscriptionProgress(progress);
          },
        );
        if (controller.signal.aborted) return;
        setTranscript(result.text);
        setTranscriptModel(result.model);
        setTranscriptRecord(result.record);
        setTranscriptDetails(detailsFrom(result));
        if (!result.text)
          toast.info(translate("uxAudio.theModelHeardNolaxv6"));
        else if (!result.record)
          toast.error(
            translate("uxAudio.transcriptCouldNotBe1xnu1"),
          );
      } catch (error) {
        if (controller.signal.aborted) {
          setTranscriptError(translate("uxAudio.transcriptionCancelledl8fd3"));
          return;
        }
        if (
          error instanceof AudioApiError &&
          error.status === 404 &&
          source.kind === "input"
        ) {
          onSourceExpired?.();
          return;
        }
        const message =
          error instanceof Error ? error.message : translate("uxAudio.transcriptionFailedsch53");
        setTranscriptError(message);
        toast.error(message);
      } finally {
        if (transcriptionAbort.current === controller) {
          transcriptionAbort.current = null;
          if (started) setTranscriptionFinishedAt(Date.now());
          setBusy(null);
          if (activeRef.current) void refreshSttStatus();
        }
      }
    },
    [
      clearTranscript,
      confirmTranscriptReplacement,
      prepareTranscriptionModel,
      refreshSttStatus,
    ],
  );

  useEffect(() => () => transcriptionAbort.current?.abort(), []);

  const selectRecord = useCallback((record: TranscriptRecord) => {
    const version = ++transcriptVersion.current;
    setTranscript(record.text);
    setTranscribedName(record.title);
    setTranscriptModel(record.model);
    setTranscriptRecord(record);
    setTranscriptError(null);
    setTranscriptExported(false);
    setTranscriptionStartedAt(null);
    setTranscriptDetails(detailsFrom(record));
    setSpeakerNames(record.speaker_names ?? {});
    if (!(record.segment_count || record.has_words)) return;
    getTranscript(record.id)
      .then((full) => {
        if (transcriptVersion.current !== version) return;
        setTranscriptDetails(detailsFrom(full));
        setSpeakerNames(full.speaker_names ?? {});
      })
      .catch((error: unknown) => {
        if (transcriptVersion.current === version)
          toastFailure(translate("uxAudio.couldNotLoadThisw13u1"), error);
      });
  }, []);

  const renameSpeaker = useCallback(
    (id: string, name: string) => {
      const previous = speakerNames[id];
      setSpeakerNames((current) => withName(current, id, name));
      if (!transcriptRecord) return;
      const version = transcriptVersion.current;
      renameTranscriptSpeakers(transcriptRecord.id, {
        [id]: name || null,
      }).catch((error: unknown) => {
        // Only this speaker, unless renamed since: a whole-map rollback erased saved renames.
        if (transcriptVersion.current !== version) return;
        setSpeakerNames((current) =>
          (current[id] ?? "") === name ? withName(current, id, previous) : current,
        );
        toastFailure(translate("uxAudio.couldNotRenameThetmsza"), error);
      });
    },
    [speakerNames, transcriptRecord],
  );

  const handleCopyTranscript = useCallback(() => {
    void copyToClipboard(transcript).then((ok) =>
      ok
        ? toast.success(translate("uxAudio.transcriptCopied1b9lt"))
        : toast.error(translate("uxAudio.couldNotCopyThe1ow4m")),
    );
  }, [transcript]);

  const handleDownloadTranscript = useCallback(
    async (format: TranscriptExportFormat) => {
      const version = transcriptVersion.current;
      if (
        (await downloadTranscript(format, {
          title: transcribedName ?? "transcript",
          text: transcript,
          model: transcriptModel,
          details: transcriptDetails,
          names: speakerNames,
        })) &&
        transcriptVersion.current === version
      )
        setTranscriptExported(true);
    },
    [transcript, transcribedName, transcriptModel, transcriptDetails, speakerNames],
  );

  return {
    transcript,
    setTranscript,
    transcribedName,
    setTranscribedName,
    transcriptModel,
    setTranscriptModel,
    transcriptRecord,
    setTranscriptRecord,
    transcriptExported,
    setTranscriptExported,
    transcriptVersion,
    transcriptionStartedAt,
    setTranscriptionStartedAt,
    transcriptionFinishedAt,
    transcriptionStopping,
    setTranscriptionStopping,
    transcriptionProgress,
    transcriptError,
    setTranscriptError,
    transcriptDetails,
    speakerNames,
    transcriptionAbort,
    clearTranscript,
    confirmTranscriptReplacement,
    runTranscription,
    selectRecord,
    renameSpeaker,
    handleCopyTranscript,
    handleDownloadTranscript,
  };
}

export type Transcription = ReturnType<typeof useTranscription>;
