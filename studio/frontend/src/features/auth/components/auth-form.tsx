// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { useAppShellReadySignal } from "@/components/app-readiness";
import { apiUrl } from "@/lib/api-base";
import { normalizeAccountUsername, transitionBrowserAccount } from "@/lib/account-transition";
import { sessionAccount, useLoginMode } from "../account-session";
import { fetchAuthStatus, loginFromForm, loginWithPassword, setLoginMode, type TokenResponse } from "../login-client";
import { Button } from "@/components/ui/button";
import { MascotImg } from "@/components/mascot-img";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { SyntheticEvent } from "react";
import { refreshSession } from "../api";
import { translateAuthDetail } from "../auth-error-text";
import {
  deadlineFromStatus,
  formatCountdown,
  hasExpired,
} from "../bootstrap-deadline";

// Bootstrap credentials injected into index.html by the backend (only present
// while default admin must_change_password is true)
declare global {
  interface Window {
    __LAiM_BOOTSTRAP__?: { username: string; password: string };
  }
}

import {
  clearAuthTokens,
  getAuthToken,
  getPostAuthRoute,
  hasAuthToken,
  hasRefreshToken,
  mustChangePassword,
  setMustChangePassword,
  storeAuthTokens,
} from "../session";

type AuthMode = "login" | "change-password";

type AuthFormProps = {
  mode: AuthMode;
};

const HIDDEN_LOGIN_USERNAME = "LAiM";

export function AuthForm({ mode }: AuthFormProps): ReactElement | null {
  const signalReady = useAppShellReadySignal();
  const navigate = useNavigate();
  const isLoginMode = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const loginMode = useLoginMode();
  const [enteredUsername, setEnteredUsername] = useState("");
  const username = loginMode === "multi" ? enteredUsername : HIDDEN_LOGIN_USERNAME;
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const reloadReadySent = useRef(false);
  // Keep the issued session so retrying a blocked cleanup does not consume the one-use setup code twice.
  const pendingLogin = useRef<{
    username: string;
    password: string;
    token: TokenResponse;
  } | null>(null);

  useEffect(() => {
    if (deadlineAt === null) {
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  useEffect(() => {
    let canceled = false;

    async function initializeAuthForm(): Promise<void> {
      // Always check the server first; localStorage flags can be stale (e.g. tokens from a previous
      // install). /api/auth/status is the source of truth for requires_password_change.
      try {
        const result = await fetchAuthStatus();
        const requiresChange = result.login_mode === "multi"
          ? hasAuthToken() && mustChangePassword()
          : result.requires_password_change;
        if (!canceled) {
          setInitialized(result.initialized);
          setRequiresPasswordChange(requiresChange);
          // One clock sample for both: nowMs is otherwise still the mount time
          // until the first tick, which adds the request duration to the figure
          // and renders a 0 from the server as "shuts down in 0 seconds".
          const sampledNow = Date.now();
          setNowMs(sampledNow);
          setDeadlineAt(
            deadlineFromStatus(result.bootstrap_deadline_seconds, sampledNow),
          );

          // Server truth wins; keep localStorage in sync both ways.
          if (requiresChange !== mustChangePassword()) {
            setMustChangePassword(requiresChange);
          }

          // Redirect between login / change-password per server state
          if (mode === "login" && requiresChange) {
            navigate({ to: "/change-password" });
            return;
          }
          if (mode === "change-password" && !requiresChange) {
            navigate({ to: "/login" });
            return;
          }

          // On login, skip to the app if a valid session exists and no password change is required.
          if (isLoginMode && !requiresChange) {
            if (hasRefreshToken()) {
              const refreshed = await refreshSession();
              if (refreshed) {
                if (!canceled) setStatusLoading(false);
                navigate({ to: getPostAuthRoute() });
                return;
              }
            }
            if (hasAuthToken()) {
              if (!canceled) setStatusLoading(false);
              navigate({ to: getPostAuthRoute() });
              return;
            }
          }
        }
      } catch (err: unknown) {
        if (!canceled) {
          setError(
            err instanceof Error
              ? translateAuthDetail(err.message)
              : translate("uxFeatures.failedToLoad18nxx"),
          );
        }
      } finally {
        if (!canceled) setStatusLoading(false);
      }
    }

    void initializeAuthForm();

    return () => {
      canceled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (statusLoading || reloadReadySent.current) return;
    reloadReadySent.current = true;
    signalReady();
  }, [statusLoading, signalReady]);

  // Seed password from bootstrap credentials injected into HTML by web CLI.
  useEffect(() => {
    function loadBootstrap() {
      const bootstrap = window.__LAiM_BOOTSTRAP__;
      if (bootstrap && !isLoginMode && !password) {
        setPassword(bootstrap.password);
      }
    }
    loadBootstrap();
  }, []);

  const blockedByState =
    initialized === false ||
    (mode === "login" && requiresPasswordChange) ||
    (mode === "change-password" && !requiresPasswordChange);

  let helperText: string | null = null;
  if (initialized === false) {
    helperText = translate("uxFeatures.authIsStillBootstrapping3cq2x");
  } else if (isLoginMode && requiresPasswordChange) {
    helperText = translate("uxFeatures.signInOnceWithThe7pdzq");
  } else if (!isLoginMode && !requiresPasswordChange) {
    helperText = translate("uxFeatures.passwordAlreadyUpdated1fgnw");
  }
  const title = isLoginMode
    ? translate("uxFeatures.welcomeBack98t84")
    : translate("uxFeatures.setupYourAccountpf3iq");
  const subtitle = isLoginMode
    ? translate("uxFeatures.signInWithYour2yn77")
    : translate("uxFeatures.createANewPassword4dg6b");
  const submitLabel = isLoginMode
    ? translate("uxApp.loginnubop")
    : translate("uxFeatures.changePasswordz0me4");
  const showSwitchLink = !isLoginMode;
  const switchText = translate("uxFeatures.passwordAlreadySetupg5td0");
  const switchLinkTo = "/login";
  const switchLinkText = translate("uxFeatures.backToLoginv3tkm");
  const currentPassword = password || window.__LAiM_BOOTSTRAP__?.password || "";
  // On first boot the backend injects __LAiM_BOOTSTRAP__ and we silently
  // reuse that password; the Current password input is only rendered for the
  // admin-forced must_change_password path where no bootstrap is available.
  const hasBootstrapPassword = Boolean(window.__LAiM_BOOTSTRAP__?.password);
  const changingFromSetupCode =
    !isLoginMode && sessionAccount(getAuthToken())?.isOwner === false;
  const passwordManagerUsername =
    isLoginMode && loginMode === "multi"
      ? null
      : sessionAccount(getAuthToken())?.username || username || null;
  const invalidChangePasswordForm =
    !isLoginMode &&
    (currentPassword.length < 8 ||
      newPassword.length < 8 ||
      /\s/.test(newPassword) ||
      newPassword !== confirmPassword ||
      currentPassword === newPassword);
  const showWhitespaceWarning = !isLoginMode && /\s/.test(newPassword);
  const showPasswordMismatchWarning =
    !isLoginMode &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isLoginMode) {
      // Mirror the disable gate: Enter / autofill can bypass the button.
      if (currentPassword.length < 8) {
        setError(
          currentPassword
            ? translate("uxFeatures.currentPasswordMustBeqy2tp")
            : translate("uxFeatures.unableToInitializeSetup023an"),
        );
        return;
      }
      if (newPassword.length < 8) {
        setError(translate("uxFeatures.newPasswordMustBeAtooh7c"));
        return;
      }
      if (/\s/.test(newPassword)) {
        setError(translate("uxFeatures.newPasswordCannotContainz61yu"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(translate("uxFeatures.passwordsDoNotMatchbuglm"));
        return;
      }
      if (currentPassword === newPassword) {
        setError(translate("uxFeatures.newPasswordMustBeDifferentacsbo"));
        return;
      }
    }

    setLoading(true);
    try {
      let token: TokenResponse;

      if (isLoginMode) {
        const normalizedUsername = normalizeAccountUsername(username);
        const pending = pendingLogin.current;
        const result = pending?.username === normalizedUsername && pending.password === password
          ? pending.token
          : await loginFromForm(loginMode, username, password);
        if (!result) {
          setPassword("");
          return;
        }
        pendingLogin.current = { username: normalizedUsername, password, token: result };
        token = result;
      } else {
        let accessToken = getAuthToken();

        if (hasRefreshToken()) {
          const refreshed = await refreshSession();
          accessToken = getAuthToken();
          if (!refreshed) {
            clearAuthTokens();
            accessToken = null;
          }
        }

        if (!accessToken) {
          const bootstrapToken = await loginWithPassword(username, currentPassword);
          const replaced = await transitionBrowserAccount(
            { username, accountId: bootstrapToken.account_id },
            "/change-password",
            () => {
              storeAuthTokens(bootstrapToken.access_token, bootstrapToken.refresh_token);
              setMustChangePassword(bootstrapToken.must_change_password);
            },
          );
          if (replaced) return;
          accessToken = bootstrapToken.access_token;
        }

        const response = await fetch(apiUrl("/api/auth/change-password"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });

        if (!response.ok) {
          let message = translate("uxFeatures.passwordUpdateFailedo5dhi");
          const errorPayload = (await response
            .json()
            .catch(() => null)) as { detail?: string } | null;
          if (errorPayload?.detail) message = translateAuthDetail(errorPayload.detail);
          throw new Error(message);
        }

        token = (await response.json()) as TokenResponse;
      }

      const finishSession = () => {
        setLoginMode(loginMode);
        if (!isLoginMode) setRequiresPasswordChange(false);
        setMustChangePassword(isLoginMode && token.must_change_password);
        storeAuthTokens(token.access_token, token.refresh_token);
      };
      // The transition keys on the immutable account id: a recreated username must not inherit the old browser data.
      const signedInUsername = sessionAccount(token.access_token)?.username ?? username;
      const route = isLoginMode && token.must_change_password ? "/change-password" : "/chat";
      const replaced = await transitionBrowserAccount(
        { username: signedInUsername, accountId: token.account_id },
        route,
        finishSession,
      );
      pendingLogin.current = null;
      if (replaced) return;
      navigate({ to: getPostAuthRoute() });
    } catch (err: unknown) {
      // The backend returns the correct PATH-based command ("LAiM studio
      // reset-password"), which the installer puts on PATH on every platform.
      // Do NOT rewrite it to a relative Windows path like
      // ".\LAiM_studio\Scripts\LAiM.exe ..." -- that only resolves inside
      // the LAiM home dir and fails with CommandNotFoundException elsewhere.
      // Show the backend message as-is.
      const msg =
        err instanceof Error
          ? translateAuthDetail(err.message)
          : translate("uxFeatures.authFailedv5g9s");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (statusLoading && initialized === null && error === null) return null;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1.5 text-center">
        <MascotImg
          src="LAiM_anim.webp"
          className="mx-auto mb-2 h-20 w-20 object-contain"
        />
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      {/* Not a live region: it re-renders every second, so it would be read aloud on every tick. */}
      {deadlineAt !== null && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-600">
          {hasExpired(deadlineAt - nowMs) ? (
            <>
              {translate("uxFeatures.thisInstanceIsShuttingdxa25")}</>
          ) : (
            <>{translate("uxFeatures.thisInstanceIsReachablej7e80", { p1: " ", p2: formatCountdown(deadlineAt - nowMs) })}</>
          )}
        </p>
      )}
      <form className="space-y-5" onSubmit={handleSubmit}>
        {passwordManagerUsername && (
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={passwordManagerUsername}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
        )}
        {isLoginMode && loginMode === "multi" && (
          <div className="space-y-2">
            <Label htmlFor="username">{translate("uxFeatures.username2zi1f")}</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={enteredUsername}
              onChange={(event) => setEnteredUsername(event.target.value)}
              required
            />
            <p id="setup-code-hint" className="text-sm text-muted-foreground">
              {translate("uxFeatures.firstSignInPasteknbbe")}
            </p>
          </div>
        )}
        {isLoginMode && (
          <div className="space-y-2">
            <Label htmlFor="password">{translate("uxFeatures.passwordd9l6i")}</Label>
            <div className="relative">
              <Input
                id="password"
                aria-describedby={loginMode === "multi" ? "setup-code-hint" : undefined}
                type={showPassword ? "text" : "password"}
                className="pr-10"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {!isLoginMode && (
          <>
            {!hasBootstrapPassword && (
              <div className="space-y-2">
                <Label htmlFor="current-password">{translate("uxFeatures.currentPassword7mqo6")}</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    aria-describedby={
                      changingFromSetupCode ? "current-setup-code-hint" : undefined
                    }
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {changingFromSetupCode && (
                  <p
                    id="current-setup-code-hint"
                    className="text-sm text-muted-foreground"
                  >
                    {translate("uxCopy.pasteTheSetupCode1bjke")}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">{translate("uxFeatures.newPassword3kjv2")}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  className="pr-10"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{translate("uxFeatures.confirmPasswordnjfhc")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <p
              className={`min-h-4 text-xs ${
                showWhitespaceWarning || showPasswordMismatchWarning
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
              aria-live="polite"
            >
              {showWhitespaceWarning
                ? translate("uxFeatures.newPasswordCannotContainz61yu")
                : showPasswordMismatchWarning
                  ? translate("uxFeatures.pleaseEnsurePasswordsn0rxc")
                  : translate("uxFeatures.mustBeAtLeastmbgij")}
            </p>
          </>
        )}

        {helperText && (
          <p className="text-center text-sm text-amber-600">{helperText}</p>
        )}
        {error && (
          <p className="text-center text-sm text-destructive [overflow-wrap:anywhere]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="mx-auto flex w-fit px-4"
          disabled={
            loading ||
            statusLoading ||
            blockedByState ||
            (isLoginMode && (password.length < 8 || (loginMode === "multi" && !username.trim()))) ||
            invalidChangePasswordForm
          }
        >
          {loading ? translate("uxFeatures.pleaseWait4e0su") : submitLabel}
        </Button>
      </form>

      {showSwitchLink && (
        <p className="text-center text-sm text-muted-foreground">
          {switchText}
          <Link to={switchLinkTo} className="text-primary hover:underline">
            {switchLinkText}
          </Link>
        </p>
      )}
    </div>
  );
}
