// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { usePlatformStore } from "@/config/env";
import {
  type KeylessApiAccessScope,
  type KeylessApiAccessSettings,
  loadKeylessApiAccess,
  updateKeylessApiAccess,
} from "@/features/settings/api/keyless-api-access";
import { cn } from "@/lib/utils";
import { LaptopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { SettingsRow } from "./settings-row";

type PendingGrant = Exclude<KeylessApiAccessScope, "off"> | "tools";

function activeExposureWarning(
  exposure: KeylessApiAccessSettings["exposure"],
): string {
  if (exposure === "public_url") {
    return " Активен публичный URL или туннель, поэтому доступ без ключа отключён на localhost, пока он не остановлен.";
  }
  if (exposure === "colab") {
    return " Этот runtime Colab не может получить доступ без ключа.";
  }
  return "";
}

const CONFIRM_COPY: Record<
  PendingGrant,
  {
    title: string;
    body: (exposure: KeylessApiAccessSettings["exposure"]) => string;
    action: string;
  }
> = {
  inference: {
    title: "Разрешить чат без ключа?",
    body: (exposure) =>
      `Инференс будет работать без ключа на localhost и активном приватном LAN‑слушателе. Публичные URL и Colab всегда требуют аутентификации; тренировка, файлы и настройки всё ещё требуют её.${activeExposureWarning(exposure)}`,
    action: "Разрешить чат",
  },
  full: {
    title: "Разрешить полный доступ через localhost без ключа?",
    body: (exposure) =>
      `Пользователи localhost смогут чатиться, запускать тренировки и читать, изменять и удалять файлы и настройки. Полный доступ без ключа никогда не применяется по LAN, публичному адресу или URL, туннелю или Colab.${activeExposureWarning(exposure)}`,
    action: "Разрешить всё",
  },
  tools: {
    title: "Позволять пользователям без ключа запускать инструменты?",
    body: (exposure) =>
      `Подходящие пользователи без ключа также смогут запускать через модель инструменты Python, терминала и веб-поиска. Это отдельное разрешение от доступа к API.${activeExposureWarning(exposure)}`,
    action: "Разрешить инструменты",
  },
};

export function KeylessApiAccessSection({
  onSettingsChange,
}: {
  /** fires on load and after every save, so the usage examples can follow */
  onSettingsChange?: (settings: {
    scope: KeylessApiAccessScope;
    tools: boolean;
    exposure: KeylessApiAccessSettings["exposure"];
  }) => void;
}) {
  const cloudflareUrl = usePlatformStore((state) => state.cloudflareUrl);
  const [settings, setSettings] = useState<KeylessApiAccessSettings | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingGrant | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cloudflareUrl is a trigger, not an input -- exposure is recomputed by the backend when a tunnel appears or goes away
  useEffect(() => {
    let cancelled = false;
    loadKeylessApiAccess()
      .then((next) => {
        if (!cancelled) {
          setSettings(next);
          setError(null);
          onSettingsChange?.({
            scope: next.scope,
            tools: next.tools,
            exposure: next.exposure,
          });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Не удалось загрузить доступ к API без ключа.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cloudflareUrl, onSettingsChange]);

  const save = async (next: KeylessApiAccessScope, tools?: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateKeylessApiAccess(next, tools);
      setSettings(saved);
      onSettingsChange?.({
        scope: saved.scope,
        tools: saved.tools,
        exposure: saved.exposure,
      });
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось обновить доступ к API без ключа.",
      );
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  // re-read who the dialog names, held busy so no second click lands during the round trip
  const confirm = async (confirmAs: PendingGrant) => {
    setSaving(true);
    try {
      const refreshed = await loadKeylessApiAccess();
      setSettings(refreshed);
      onSettingsChange?.({
        scope: refreshed.scope,
        tools: refreshed.tools,
        exposure: refreshed.exposure,
      });
    } catch {
      // keep the exposure already on screen; the dialog still states the scope
    } finally {
      setSaving(false);
    }
    setPending(confirmAs);
  };

  const scope = settings?.scope ?? "off";
  const tools = settings?.tools === true;
  const busy = settings === null || saving;

  const request = (next: KeylessApiAccessScope, confirmAs: PendingGrant) => {
    if (next === "off" || scope === "full") {
      void save(next);
      return;
    }
    void confirm(confirmAs);
  };

  const requestTools = (on: boolean) => {
    if (!on) {
      void save(scope, false);
      return;
    }
    void confirm("tools");
  };

  const applyPending = () => {
    if (pending === "tools") {
      void save(scope, true);
      return;
    }
    if (pending) {
      void save(pending);
    }
  };

  return (
    <section
      data-settings-label="Доступ к API без ключа"
      className="overflow-hidden rounded-lg border border-border/70"
    >
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40">
            <HugeiconsIcon
              icon={LaptopIcon}
              className="size-4 text-foreground"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="settings-heading text-base font-semibold font-heading">
              Доступ к API без ключа
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Используйте LAiM из других приложений без создания ключа API. Вход
              в систему не меняется; публичные URL и Colab всегда требуют ключ.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="border-t border-border/60 px-4 py-2.5 text-xs leading-snug text-destructive">
          {error}
        </p>
      ) : null}

      <div className="border-t border-border/60 px-4 py-1">
        <SettingsRow
          label="Чат и инференс"
          description="Обслуживать одобренные OpenAI и Anthropic эндпоинты инференса на localhost и активном приватном LAN."
        >
          <Switch
            checked={scope !== "off"}
            disabled={busy}
            onCheckedChange={(on) =>
              request(on ? "inference" : "off", "inference")
            }
            aria-label="Чат и инференс"
          />
        </SettingsRow>

        <SettingsRow
          label="Всё остальное"
          description="Также обслуживать тренировку, файлы и настройки, но только для локальных звонящих."
        >
          <Switch
            checked={scope === "full"}
            disabled={busy}
            onCheckedChange={(on) => request(on ? "full" : "inference", "full")}
            aria-label="Всё остальное"
          />
        </SettingsRow>

        <SettingsRow
          label="Разрешить инструменты"
          description="Разрешить пользователям без ключа использовать встроенные инструменты Python, терминала и веб-поиска. По умолчанию отключено."
        >
          <Switch
            checked={tools}
            disabled={busy || scope === "off"}
            onCheckedChange={requestTools}
            aria-label="Разрешить инструменты"
          />
        </SettingsRow>
      </div>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending ? CONFIRM_COPY[pending].title : ""}
            </DialogTitle>
            <DialogDescription>
              {pending
                ? CONFIRM_COPY[pending].body(settings?.exposure ?? null)
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Отмена
            </Button>
            <Button
              disabled={saving}
              className={cn(
                (pending === "full" || pending === "tools") &&
                  "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
              )}
              onClick={applyPending}
            >
              {pending ? CONFIRM_COPY[pending].action : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
