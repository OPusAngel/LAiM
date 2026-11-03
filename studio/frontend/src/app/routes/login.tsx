// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { createRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { requireGuest } from "../auth-guards";
import { Route as rootRoute } from "./__root";

const LoginPage = lazy(() =>
  import("@/features/auth").then((m) => ({ default: m.LoginPage })),
);

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  staticData: { title: translate("uxApp.loginnubop"), isAuthFlow: true },
  beforeLoad: () => requireGuest(),
  component: LoginPage,
});
