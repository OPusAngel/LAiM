// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { parseBackendDownloadProgress } from "@/components/tauri/backend-download-progress";
import { DiagnosticsCopyActions } from "@/components/tauri/diagnostics-copy-actions";
import { LogDetails } from "@/components/tauri/log-details";
import { shouldUseNativeMacWindowTitlebar } from "@/components/tauri/window-titlebar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { UpdateStatus } from "@/hooks/use-tauri-update";
import type { CopySupportDiagnosticsResult } from "@/lib/tauri-diagnostics";

import { AnimatePresence, motion } from "motion/react";

interface UpdateScreenProps {
  status: UpdateStatus;
  logs: string[];
  progress: number;
  error: string | null;
  onRetry: () => void;
  onSkipRestart: () => void;
  onCopyDiagnostics: () => Promise<CopySupportDiagnosticsResult>;
}

const EASE_OUT_QUART: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

function Logo() {
  // LAiM main logo: the image itself carries the mark and the wordmark,
  // centered, replacing the old sticker + "LAiM" text lockup.
  return (
    <div className="flex items-center justify-center gap-3">
      <img
        src="/LAiM_logo.png"
        alt="LAiM"
        className="h-[calc(198px*var(--ui-space-scale,1))] max-w-[min(78vw,630px)] w-auto object-contain"
      />
    </div>
  );
}

function statusLabel(status: UpdateStatus): string {
  switch (status) {
    case "updating-backend":
      return "Обновление серверной части...";
    case "downloading":
      return "Загрузка обновления приложения...";
    case "installing":
      return "Установка обновления...";
    case "error":
      return "Не удалось обновить приложение";
    default:
      return "Обновление...";
  }
}

function statusSubtext(status: UpdateStatus, progress: number): string {
  switch (status) {
    case "updating-backend":
      return "Это может занять несколько минут. Не закрывайте приложение.";
    case "downloading":
      return `Загружено: ${progress}%`;
    case "installing":
      return "Приложение скоро будет перезапущено.";
    case "error":
      return "Во время обновления возникла проблема.";
    default:
      return "";
  }
}

export function UpdateScreen({
  status,
  logs,
  progress,
  error,
  onRetry,
  onSkipRestart,
  onCopyDiagnostics,
}: UpdateScreenProps) {
  const isError = status === "error";
  const backendDownload =
    status === "updating-backend"
      ? parseBackendDownloadProgress(logs.at(-1) ?? "")
      : null;
  const downloadProgress =
    status === "downloading" ? progress : backendDownload?.percent;

  return (
    <div className="box-border flex h-full w-full flex-col items-center overflow-y-auto bg-background pb-6 pt-[var(--studio-startup-top-inset,0px)]">
      {shouldUseNativeMacWindowTitlebar() && (
        <div
          data-tauri-drag-region={true}
          aria-hidden="true"
          className="pointer-events-auto fixed inset-x-0 top-0 z-50 h-[var(--studio-mac-titlebar-height,34px)] select-none"
        />
      )}
      <div className="flex min-h-0 w-full max-w-md flex-1 items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: EASE_OUT_QUART }}
          className="flex h-full w-full flex-col items-center text-center"
        >
          <div className="flex flex-1 items-center">
            <Logo />
          </div>

          <div className="mb-10 flex w-full flex-col items-center gap-2">
            {!isError && <Spinner className="size-6 text-primary" />}
            <p
              className={
                isError
                  ? "text-sm font-medium text-destructive"
                  : "text-sm font-bold text-foreground"
              }
            >
              {statusLabel(status)}
            </p>
            <p className="text-sm text-muted-foreground">
              {statusSubtext(status, progress)}
            </p>

            {backendDownload && (
              <div className="mt-2 w-full max-w-sm text-xs text-muted-foreground">
                <p className="break-words">
                  Загрузка: {backendDownload.file}
                </p>
                <p>{backendDownload.detail}</p>
              </div>
            )}

            {downloadProgress != null && (
              <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <progress
                  aria-label={
                    backendDownload
                      ? `Загрузка ${backendDownload.file}`
                      : "Загрузка обновления приложения"
                  }
                  max={100}
                  value={downloadProgress}
                  className="sr-only"
                />
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <AnimatePresence>
              {isError && error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="max-w-md text-xs text-muted-foreground"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {isError && (
              <DiagnosticsCopyActions onCopyDiagnostics={onCopyDiagnostics}>
                <Button size="hero" onClick={onRetry}>
                  Повторить
                </Button>
                <Button variant="muted" size="hero" onClick={onSkipRestart}>
                  Пропустить и перезапустить
                </Button>
              </DiagnosticsCopyActions>
            )}

            <LogDetails label="подробности обновления" lines={logs} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
