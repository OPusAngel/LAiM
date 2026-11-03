// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

/** One file a tool call created in the chat's workdir. */
export type WorkdirFile = {
  name: string;
  size: number | null;
};

const FILES_MARKER = "\n__FILES__:";

/** The tools that run code in the workdir. Their result is always wrapped: the session is the only record of where it ran. */
export const WORKDIR_RUN_TOOLS = new Set(["python", "terminal"]);

/** The tools that emit the file envelope; edit_file only for a file it created. Nothing else's output is an envelope. */
export const WORKDIR_FILE_TOOLS = new Set([...WORKDIR_RUN_TOOLS, "edit_file"]);

/**
 * The tools that emit the image envelope: the workdir ones, and the provider's hosted
 * code execution, which attaches its plots the same way. The backend keeps a
 * well-formed `__IMAGES__` line from any other tool as content the model reads, so
 * the card has to keep it too, or the user sees less than the model was given.
 */
export const IMAGE_SENTINEL_TOOLS = new Set([...WORKDIR_RUN_TOOLS, "code_execution"]);

function isWorkdirFile(entry: unknown): entry is WorkdirFile {
  if (typeof entry !== "object" || entry === null) return false;
  const { name, size } = entry as { name?: unknown; size?: unknown };
  return (
    typeof name === "string" &&
    name.length > 0 &&
    (size === null || size === undefined || typeof size === "number")
  );
}

/**
 * Split a tool result into its visible text and the files the call created.
 *
 * `__FILES__` sits ahead of `__IMAGES__` because older clients slice from that
 * marker to the end. An unparseable payload leaves the text untouched.
 */
export function extractCreatedFiles(raw: string): {
  text: string;
  files: WorkdirFile[];
} {
  const start = raw.lastIndexOf(FILES_MARKER);
  if (start === -1) return { text: raw, files: [] };

  const payloadStart = start + FILES_MARKER.length;
  const nextMarker = raw.indexOf("\n__", payloadStart);
  const end = nextMarker === -1 ? raw.length : nextMarker;
  try {
    const parsed: unknown = JSON.parse(raw.slice(payloadStart, end));
    // Every entry, not just the array: a tool printing `__FILES__:[null]` would
    // otherwise have its output eaten and throw while rendering file.name.
    if (!Array.isArray(parsed) || !parsed.every(isWorkdirFile)) {
      return { text: raw, files: [] };
    }
    return { text: raw.slice(0, start) + raw.slice(end), files: parsed };
  } catch {
    return { text: raw, files: [] };
  }
}

/** ``files`` as the cards need it: absent, or entries with a usable name. */
export function isWorkdirFileList(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  if (!Array.isArray(val)) return false;
  return val.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { name?: unknown }).name === "string",
  );
}

/**
 * A python/terminal result carrying the chat's workdir context alongside the
 * text the model actually saw.
 */
export function isWorkdirToolResult(
  val: unknown,
): val is { text: string; sessionId: string } {
  if (typeof val !== "object" || val === null) return false;
  const v = val as {
    text?: unknown;
    sessionId?: unknown;
    images?: unknown;
    files?: unknown;
  };
  // images too: it is always in LAiM's own wrapper, and a tool result that merely has text and
  // sessionId is someone else's, whose other fields would be dropped on export.
  return (
    typeof v.text === "string" &&
    typeof v.sessionId === "string" &&
    Array.isArray(v.images) &&
    // Persisted content can carry anything: the cards map over this and read
    // name off each entry, so anything else takes the whole chat view down.
    isWorkdirFileList(v.files)
  );
}

/** Whether a workdir tool call's card shows a created-files row. */
export function hasCreatedFiles(toolName: unknown, result: unknown): boolean {
  if (typeof toolName !== "string" || !WORKDIR_FILE_TOOLS.has(toolName)) return false;
  if (!isWorkdirToolResult(result)) return false;
  const { files } = result as { files?: unknown[] | null };
  return Array.isArray(files) && files.length > 0;
}

/** Ids a path segment can carry: ASGI decodes %2F before it matches a route. */
const PATH_SAFE_SESSION = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The route both sides spell: `workdirRoutePrefix` builds it for the cards, and a model that
 * writes `![plot](/api/inference/workdir/<sid>/plot.png)` into its own markdown carries it back.
 */
export const WORKDIR_ROUTE_PREFIX = "/api/inference/workdir/";

/** Where this session's files live, as the routes expect to be asked. */
export function workdirRoutePrefix(sessionId: string): {
  prefix: string;
  query: string;
} {
  if (PATH_SAFE_SESSION.test(sessionId)) {
    return {
      prefix: `${WORKDIR_ROUTE_PREFIX}${encodeURIComponent(sessionId)}`,
      query: "",
    };
  }
  // An API client can pick anything; carry it where it survives the round trip.
  return {
    prefix: "/api/inference/workdir/_",
    query: `?session=${encodeURIComponent(sessionId)}`,
  };
}

/**
 * The workdir a chat's tool calls run in. Threads inside a project share the
 * project's workspace, so their files land in one place instead of one folder
 * per thread.
 */
export function workdirSessionIdFor(
  threadId: string | undefined,
  projectId: string | null | undefined,
): string | undefined {
  return projectId ? `project-${projectId}` : threadId;
}

/**
 * Extensions the route serves inline as an image, mirroring `_WORKDIR_MEDIA_TYPES` in
 * `backend/routes/inference.py`. `.svg` is absent on purpose: the filename is model-chosen, so an
 * inline SVG would be same-origin script execution and the route keeps serving it as a download.
 */
export const WORKDIR_INLINE_IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
]);

/** Somebody else's URL: `data:`/`blob:` render as they are, `http(s)` is blocked by the sanitizer. */
const HAS_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/;
const PROTOCOL_RELATIVE_RE = /^[/\\]{2}/;

/**
 * `100%.png` is a real filename; a stray `%` must not throw on every render. Exported because the
 * download name is cut from the ENCODED route path and must be decoded back before it names a file.
 */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The FILE a model-written markdown `src` points at, or null when it does not point at a workdir
 * file at all. A bare relative path (`outputs/plot.png`) counts: the sanitizer already dropped every
 * scheme-carrying src, so a scheme-less image path in an answer is this chat's file and nothing else
 * -- and one carrying `..` points somewhere that is NOT this chat's folder, so it stays raw and fails
 * honestly instead of silently fetching another chat's file (or another route).
 */
export function workdirFileForSrc(src: string): string | null {
  const file = workdirPathForSrc(src);
  if (file === null) return null;
  const name = file.slice(file.lastIndexOf("/") + 1);
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  // A `.csv` is a download card, not an `<img>`; leave it to the file cards.
  return WORKDIR_INLINE_IMAGE_EXTS.has(ext) ? file : null;
}

// What a one-segment link must end in to be a file, since `example.tech` is a site.
const LINK_FILE_EXTS = new Set(
  ("csv tsv json jsonl txt md markdown html htm pdf png jpg jpeg gif webp svg bmp py ipynb js ts sh " +
    "yaml yml toml xml log xlsx xls docx doc pptx odt ods zip tar gz parquet wav mp3 mp4 webm mov").split(" "),
);
// A first segment shaped like a domain (`docs.museum/report.pdf`, `пример.рф`) or an IPv4 address, not a folder.
const HOST_SEGMENT_RE = /^(?:(?:[\p{L}\p{N}-]+\.)+(?:\p{L}{2,}|xn--[a-z\d-]+)|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/iu;

/** Workdir file a markdown link targets (`outputs/report.csv`); needs an extension, so `#intro` stays a link. */
export function workdirFileForHref(href: string): string | null {
  const trimmed = href.trim();
  if (trimmed.startsWith("#") || /^www\./i.test(trimmed)) return null;
  const file = workdirPathForSrc(href);
  const ext = file && /[^/]\.([A-Za-z0-9]{1,8})$/.exec(file)?.[1]?.toLowerCase();
  if (!file || !ext) return null;
  const [first, ...rest] = file.split("/");
  if (rest.length === 0) return LINK_FILE_EXTS.has(ext) ? file : null;
  return HOST_SEGMENT_RE.test(first ?? "") ? null : file;
}

function workdirPathForSrc(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || HAS_SCHEME_RE.test(trimmed) || PROTOCOL_RELATIVE_RE.test(trimmed)) {
    return null;
  }
  // The sid rides in `?session=` when it is not path-safe; either way the caller reads it back with
  // workdirSessionInSrc, so it never reaches the file path.
  const path = trimmed.split("?")[0].split("#")[0];
  if (path.startsWith("/") && !path.startsWith(WORKDIR_ROUTE_PREFIX)) {
    return null; // some other app route (`/assets/...`), not a workdir file
  }
  const segments = path.startsWith(WORKDIR_ROUTE_PREFIX)
    ? // The recorded sid is not part of the file path; workdirSessionInSrc reads it back out.
      path.slice(WORKDIR_ROUTE_PREFIX.length).split("/").slice(1)
    : path.split("/");
  // Decode FIRST, then judge: `%2e%2e` IS `..`, and a dot segment pops the scope segment the caller
  // prepends -- one reads another chat's folder, two land on another route. A bare `.` is noise URL
  // parsing drops anyway; drop it here so callers see one canonical shape.
  const decoded = segments.map(decodeSegment);
  // Encoded separators must not become new path segments after this check.
  if (decoded.some((segment) => segment === ".." || /[/\\]/.test(segment))) {
    return null;
  }
  const parts = decoded.filter((segment) => segment !== ".");
  return parts.length > 0 ? parts.join("/") : null;
}

/**
 * The session a `src` records for itself: the segment after the route prefix (or the `?session=`
 * query when the id was not path-safe at write time). A bare relative path records nothing: null.
 */
export function workdirSessionInSrc(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || HAS_SCHEME_RE.test(trimmed) || PROTOCOL_RELATIVE_RE.test(trimmed)) {
    return null;
  }
  const [path, ...query] = trimmed.split("#")[0].split("?");
  // A bare relative path records nothing: the caller's fallback scope is all there is.
  if (!path.startsWith(WORKDIR_ROUTE_PREFIX)) return null;
  const segment = path.slice(WORKDIR_ROUTE_PREFIX.length).split("/")[0] ?? "";
  // `workdirRoutePrefix` carries a not-path-safe id in the query under `_`; mirror it back out.
  if (query.length > 0) {
    const session = new URLSearchParams(query.join("?")).get("session");
    // URLSearchParams has already decoded the query value.
    if (session) return session;
  }
  return segment ? decodeSegment(segment) : null;
}

/**
 * The URL to fetch for a workdir `src`. The session the src RECORDS wins when it names one: that is
 * the folder the files landed in when the message was WRITTEN -- where a chat moved between projects
 * still has its older files, and exactly what the tool card above the prose resolves from its own
 * persisted envelope. A model echoes real workdir paths out of the stdout it saw; discarding that echo
 * is what broke those answers' images after a move. Only a path that records nothing (a bare
 * `outputs/plot.png`) falls back to this chat's CURRENT scope: `project-<id>` else threadId.
 */
export function markdownWorkdirImageSrc(
  src: string,
  ctx: { threadId: string | undefined; projectId: string | null | undefined },
): string | null {
  const file = workdirFileForSrc(src);
  if (file === null) return null;
  const sessionId =
    workdirSessionInSrc(src) ?? workdirSessionIdFor(ctx.threadId, ctx.projectId);
  // No recorded session and no thread yet means no directory to read from; the raw src stays as it is.
  return sessionId ? workdirFilePath(sessionId, file) : null;
}

export function workdirFilePath(sessionId: string, filename: string): string {
  // Segment by segment: a file written to outputs/report.csv keeps a real "/"
  // in the URL, which encodeURIComponent on the whole name would have escaped.
  const path = filename
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const { prefix, query } = workdirRoutePrefix(sessionId);
  return `${prefix}/${path}${query}`;
}

/** Route URL for a link to a tool-written file (a bare relative path would be blocked); null otherwise. */
export function markdownWorkdirLinkHref(
  href: string,
  ctx: { threadId: string | undefined; projectId: string | null | undefined },
): string | null {
  const file = workdirFileForHref(href);
  if (file === null) return null;
  const sessionId = workdirSessionInSrc(href) ?? workdirSessionIdFor(ctx.threadId, ctx.projectId);
  return sessionId ? workdirFilePath(sessionId, file) : null;
}
