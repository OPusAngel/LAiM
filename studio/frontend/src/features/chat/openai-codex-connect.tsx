// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { openExternalLink } from "@/lib/open-link";
import { useEffect, useRef, useState } from "react";
import {
  cancelCodexOAuthFlow,
  completeCodexOAuth,
  disconnectCodexOAuth,
  getCodexOAuthFlow,
  startCodexOAuth,
  type CodexOAuthFlow,
  type ProviderAuthStatus,
} from "./api/providers-api";

export function isTrustedCodexAuthUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.origin === "https://auth.openai.com" &&
      (url.pathname === "/oauth/authorize" || url.pathname === "/codex/device") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

interface Props {
  providerId: string | null;
  authStatus?: ProviderAuthStatus;
  onChanged: () => void | Promise<void>;
  ensureProvider?: () => Promise<string>;
  initialFlow?: CodexOAuthFlow | null;
}

export function OpenAICodexConnect({
  providerId,
  authStatus,
  onChanged,
  ensureProvider,
  initialFlow = null,
}: Props) {
  const [flow, setFlow] = useState<CodexOAuthFlow | null>(initialFlow);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [activeProviderId, setActiveProviderId] = useState(providerId);
  const [locallyDisconnected, setLocallyDisconnected] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (providerId) setActiveProviderId(providerId);
  }, [providerId]);
  useEffect(() => {
    if (!flow || flow.status !== "pending" || !activeProviderId) return;
    const delay = flow.method === "device" ? 2500 : 1500;
    const timer = window.setInterval(() => {
      if (Date.now() >= flow.expires_at * 1000) {
        setFlow((current) => current ? {
          ...current,
          status: "error",
          get message() { return translate("uxChat.authorizationExpiredStartA8eq6a"); },
        } : current);
        setError(translate("uxChat.authorizationExpiredStartA5l1r1"));
        return;
      }
      void getCodexOAuthFlow(activeProviderId, flow.flow_id)
        .then((next) => {
          if (!mounted.current) return;
          setFlow(next);
          if (next.status === "connected") void onChanged();
          if (next.status === "error") setError(next.message || translate("uxChat.authorizationFailed33mi9"));
        })
        .catch((cause) => mounted.current && setError(cause instanceof Error ? cause.message : translate("uxChat.authorizationFailed33mi9")));
    }, delay);
    return () => window.clearInterval(timer);
  }, [flow, activeProviderId, onChanged]);

  async function start(method: "browser" | "device") {
    setBusy(true);
    setError("");

    setLocallyDisconnected(false);
    try {
      const resolvedProviderId = activeProviderId ?? await ensureProvider?.();
      if (!resolvedProviderId) {
        throw new Error(translate("uxChat.couldNotCreateThec4h7n"));
      }
      setActiveProviderId(resolvedProviderId);
      const next = await startCodexOAuth(resolvedProviderId, method);
      setFlow(next);
      const url = next.authorization_url || next.verification_url;
      if (url) {
        if (!isTrustedCodexAuthUrl(url)) throw new Error(translate("uxChat.theAuthorizationURLWasl29g2"));
        // Sign-in needs the provider's cookies, which the browser panel does not keep.
        openExternalLink(url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate("uxChat.authorizationFailed33mi9"));
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!flow || !activeProviderId || !callbackUrl.trim()) return;
    setBusy(true);
    setError("");
    try {
      const next = await completeCodexOAuth(activeProviderId, flow.flow_id, callbackUrl.trim());
      setFlow(next);

      setLocallyDisconnected(false);
      setCallbackUrl("");
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate("uxChat.authorizationFailed33mi9"));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!flow || !activeProviderId || flow.status !== "pending") return;
    setBusy(true);
    setError("");
    try {
      await cancelCodexOAuthFlow(activeProviderId, flow.flow_id);
      setFlow({ ...flow, status: "cancelled", get message() { return translate("uxChat.authorizationCancelledmp29e"); } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate("uxChat.cancellationFailedethrt"));
    } finally {
      setBusy(false);
    }
  }



  async function disconnect() {
    if (!activeProviderId) return;
    setBusy(true);
    setError("");
    try {
      await disconnectCodexOAuth(activeProviderId);
      setFlow(null);

      setLocallyDisconnected(true);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate("uxChat.disconnectFailedj3pqa"));
    } finally {
      setBusy(false);
    }
  }

  const connected =
    !locallyDisconnected &&
    (authStatus === "connected" || flow?.status === "connected");

  const visibleError = error || (flow?.status === "error" ? flow.message || translate("uxChat.authorizationFailedhphf2") : "");
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/45 p-4">
      <div>
        <p className="text-sm font-medium">{translate("uxChat.chatGPTSubscription59ik0")}</p>
        <p className="text-xs text-muted-foreground">
          {connected
            ? translate("uxChat.connectedSecurelyOnThisxy8vd")
            : authStatus === "reauthorization_required"
              ? translate("uxChat.yourSavedAuthorizationIswch7w")
              : translate("uxChat.authorizeInYourSystemmsg3h")}
        </p>
      </div>
      {flow?.method === "device" && flow.status === "pending" ? (
        <div data-reload-snapshot-sensitive className="space-y-2 text-sm">
          <p>{translate("uxCopy.enterThisCodeInavre8")}</p>
          <code className="block w-fit rounded bg-muted px-3 py-2 font-mono text-base">{flow.user_code}</code>
          <p className="text-xs text-muted-foreground">{translate("uxCopy.deviceLoginMayNeedaett3")}</p>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copyToClipboard(flow.user_code || "")}
          >{translate("uxChat.copyCodexgkv7")}</Button>

          <p className="text-xs text-muted-foreground">{translate("uxChat.expiresyf7b7", { p1: new Date(flow.expires_at * 1000).toLocaleTimeString() })}</p>
        </div>
      ) : null}
      {flow?.method === "browser" && flow.status === "pending" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">If the browser cannot return automatically, paste the complete localhost callback URL.</p>
          <div className="flex gap-2">
            <Input data-reload-snapshot-sensitive value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} placeholder="http://localhost:1455/auth/callback?..." />
            <Button type="button" variant="outline" disabled={busy || !callbackUrl.trim()} onClick={() => void complete()}>Complete</Button>
          </div>
        </div>
      ) : null}
      {flow?.status === "cancelled" ? (
        <p className="text-xs text-muted-foreground">{translate("uxChat.authorizationCancelledmp29e")}</p>
      ) : null}

      {visibleError ? <p role="alert" className="text-xs text-destructive">{visibleError}</p> : null}
      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={() => void start("browser")}>
              {authStatus === "reauthorization_required" ? translate("uxChat.reconnectInBrowserx5wzl") : translate("uxChat.connectInBrowsermidmo")}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void start("device")}>{translate("uxChat.useDeviceCode1raga")}</Button>
            {flow?.status === "pending" ? (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void cancel()}>Cancel</Button>
            ) : null}
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void disconnect()}>{translate("uxChat.disconnectLocallyhdggl")}</Button>
        )}
      </div>
    </section>
  );
}
