// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import type { Root, RootContent } from "hast";
import type { Plugin } from "unified";

import { safeMarkdownUrl } from "../../lib/safe-markdown-url.ts";
import {
	decodeSegment,
	markdownWorkdirImageSrc,
	markdownWorkdirLinkHref,
} from "./workdir-files.ts";

type WorkdirScope = Parameters<typeof markdownWorkdirImageSrc>[1];

function unsafeImagePath(src: string): boolean {
	if (/^(data|blob):/i.test(src)) return false;
	return src
		.split(/[?#]/)[0]
		.split("/")
		.some((segment) => {
			const decoded = decodeSegment(segment);
			return (
				decoded === ".." ||
				decoded.includes("/") ||
				decoded.includes("\\") ||
				Array.from(decoded).some(
					(char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
				)
			);
		});
}

export const rehypeWorkdirImages: Plugin<[WorkdirScope], Root> =
	function rehypeWorkdirImages(scope) {
		return (tree) => {
			function walk(node: Root | RootContent): void {
				if (node.type === "element" && node.tagName === "img") {
					const src = node.properties.src;
					if (typeof src === "string") {
						// Check URLs before harden changes relative paths or removes origins.
						const safe = safeMarkdownUrl(src, "src", node);
						node.properties.src =
							safe && !unsafeImagePath(safe)
								? (markdownWorkdirImageSrc(safe, scope) ?? safe)
								: undefined;
					}
				}
				// File links too, which harden would block as relative paths; the link's menu opens them.
				if (node.type === "element" && node.tagName === "a") {
					const href = node.properties.href;
					if (typeof href === "string") {
						const resolved = markdownWorkdirLinkHref(href, scope);
						if (resolved) node.properties.href = resolved;
					}
				}
				if ("children" in node) node.children.forEach(walk);
			}
			walk(tree);
		};
	};
