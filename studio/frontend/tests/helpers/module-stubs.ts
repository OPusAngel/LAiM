// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

// Kept out of kit.ts on purpose, like tsx-ast.ts: only the few tests that drive a
// component or a hook directly should pay for loading the TypeScript compiler.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "@typescript/typescript6";

import {
  LAiM_PROTOCOL,
  LAiM_SCHEME,
  isLAiMProtocol,
} from "../../src/config/deep-link.ts";
import { en } from "../../src/i18n/locales/en.ts";

/** A JSX element as the stub runtime below records it. */
export type StubElement = {
  type: unknown;
  props: Record<string, unknown>;
};

const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

function enMessage(key: string): string {
  let cursor: unknown = en;
  for (const segment of key.split(".")) {
    if (cursor === null || typeof cursor !== "object") return key;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === "string" ? cursor : key;
}

function enTranslate(
  key: string,
  values?: Record<string, unknown> | undefined,
): string {
  if (values === undefined) return enMessage(key);
  return enMessage(key).replace(PLACEHOLDER, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name] ?? "")
      : match,
  );
}

/** For a test that runs a slice of src through `new Function`, where no import can reach. */
export { enTranslate };

/**
 * Stand-ins for imports no stub map names.
 *
 * The translation sweep added `@/i18n` to modules all over src, and a stub map
 * lists a module's imports as they were when the test was written. Loading the
 * English catalog directly keeps those tests reading the strings they assert on
 * without each one restating the same ten-line stub.
 */
const builtInStubs: Record<string, unknown> = {
  "@/config/deep-link": { LAiM_SCHEME, LAiM_PROTOCOL, isLAiMProtocol },
  "@/i18n": {
    translate: enTranslate,
    useT: () => enTranslate,
    useLocale: () => "en",
    getLocale: () => "en",
    messages: { en },
  },
};

/** The stand-ins above, for a test whose stub map cannot fall back to them. */
export const defaultStubs = builtInStubs;

/** The sibling a relative specifier names, trying the extensions src actually uses. */
function resolveSibling(fromPath: string, specifier: string): URL {
  const base = new URL(specifier, pathToFileURL(fromPath));
  for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const candidate = new URL(base.href + suffix);
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  throw new Error(`cannot resolve import "${specifier}" from ${fromPath}`);
}

/**
 * Runs one shipped src module with every import replaced by a stub, so a test can
 * call the real source with dependencies it controls. Bare node cannot import a
 * .tsx file at all, and a hook needs a React whose renders the test drives.
 */
export function loadWithStubs<T>(
  moduleUrl: URL,
  stubs: Record<string, unknown>,
  options: { relativePassthrough?: boolean } = {},
): T {
  const path = fileURLToPath(moduleUrl);
  const source = readFileSync(path, "utf8").replaceAll(
    "import.meta.url",
    JSON.stringify(pathToFileURL(path).href),
  );
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      // TypeScript 6 turns this on by default, which would wrap the stubs in __importDefault.
      esModuleInterop: false,
    },
  });
  const loaded = { exports: {} as T };
  const requireStub = (specifier: string): unknown => {
    if (specifier in stubs) {
      const builtIn = builtInStubs[specifier];
      // A stub map written before a module grew an import still wins for the
      // exports it names, but the stand-in above fills the ones it never lists.
      return builtIn && stubs[specifier] && typeof stubs[specifier] === "object"
        ? { ...builtIn, ...(stubs[specifier] as Record<string, unknown>) }
        : stubs[specifier];
    }
    // Opt-in: load a sibling source for real, with the same stubs, instead of failing.
    // A stub map names the module's imports, so without this every import ADDED to the
    // module under test breaks each test that loads it, even when the new import is
    // irrelevant to what that test drives. Off by default: a test that means to cut a
    // dependency off still wants the throw.
    if (options.relativePassthrough && specifier.startsWith(".")) {
      return loadWithStubs(resolveSibling(path, specifier), stubs, options);
    }
    if (specifier in builtInStubs) return builtInStubs[specifier];
    throw new Error(`no stub for import "${specifier}" in ${path}`);
  };
  new Function("require", "module", "exports", outputText)(
    requireStub,
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

/** A react/jsx-runtime that builds plain records instead of React elements. */
export function stubJsxRuntime(): Record<string, unknown> {
  const jsx = (type: unknown, props: Record<string, unknown>): StubElement => ({
    type,
    props,
  });
  return { jsx, jsxs: jsx, Fragment: Symbol.for("Fragment") };
}
