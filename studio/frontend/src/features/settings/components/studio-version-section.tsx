// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { getAuthToken, refreshSession } from "@/features/auth";
import { LAiM_RELEASE_VERSION } from "@/lib/laim-release";
import { useT } from "@/i18n";
import { apiUrl } from "@/lib/api-base";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

type ApiObject = Record<string, unknown>;

function parseStudioVersion(data: ApiObject): string | null {
  const studioVersion = data["studio_version"];
  return typeof studioVersion === "string" && studioVersion ? studioVersion : null;
}

async function requestStudioVersion(token: string | null): Promise<string | null> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl("/api/health"), { headers });
  if (!res.ok) {
    return null;
  }
  return parseStudioVersion((await res.json()) as ApiObject);
}

async function fetchStudioVersion(): Promise<string | null> {
  try {
    const token = getAuthToken();
    const version = await requestStudioVersion(token);
    if (!token || version) {
      return version;
    }

    if (await refreshSession()) {
      return requestStudioVersion(getAuthToken());
    }
    return version;
  } catch {
    return null;
  }
}

// Shared "LAiM" version block, shown in both General and About. The About
// tab passes llamaCppVersion and audioCppVersion to surface the installed
// llama.cpp and audio.cpp builds alongside the version rows; General omits them,
// so those rows only show on About. Children are appended below the version
// rows, for controls that act on them.
export function StudioVersionSection({
  llamaCppVersion,
  audioCppVersion,
  desktopAppVersion,
  children,
}: {
  llamaCppVersion?: string | null;
  audioCppVersion?: string | null;
  desktopAppVersion?: string | null;
  children?: ReactNode;
} = {}) {
  const t = useT();
  const [studioVersion, setStudioVersion] = useState("dev");

  useEffect(() => {
    let canceled = false;
    fetchStudioVersion().then((next) => {
      if (!canceled && next) setStudioVersion(next);
    });
    return () => {
      canceled = true;
    };
  }, []);

  return (
    <SettingsSection title="LAiM" hideHeading={true}>
      <SettingsRow label={t("settings.about.studioVersion")}>
        <code className="font-mono text-xs text-muted-foreground">
          {studioVersion}
        </code>
      </SettingsRow>
      <SettingsRow label={t("settings.about.packageVersion")}>
        <code className="font-mono text-xs text-muted-foreground">
          {LAiM_RELEASE_VERSION}
        </code>
      </SettingsRow>
      {desktopAppVersion !== undefined ? (
        <SettingsRow label={t("settings.about.desktopAppVersion")}>
          <code className="font-mono text-xs text-muted-foreground">
            {desktopAppVersion ??
              t("settings.about.desktopAppVersionUnavailable")}
          </code>
        </SettingsRow>
      ) : null}
      {llamaCppVersion ? (
        <SettingsRow label={t("settings.about.llamaCppVersion")}>
          <code className="font-mono text-xs text-muted-foreground">
            {llamaCppVersion}
          </code>
        </SettingsRow>
      ) : null}
      {audioCppVersion ? (
        <SettingsRow label={t("settings.about.audioCppVersion")}>
          <code className="font-mono text-xs text-muted-foreground">
            {audioCppVersion}
          </code>
        </SettingsRow>
      ) : null}
      {children}
    </SettingsSection>
  );
}
