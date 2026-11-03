// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// The app resolves "@/..." and extensionless relative imports through vite and tsconfig's
// "bundler" mode. Registering the hook from a test file's body is too late for the modules
// that file imports statically, so the test script preloads it for every runner process.
import { register } from "node:module";

register("./bundler-resolver.mjs", import.meta.url);
