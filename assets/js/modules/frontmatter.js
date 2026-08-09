/**
 * frontmatter.js — reads the metadata block at the top of a post.
 *
 * A post file looks like this:
 *
 *     ---
 *     title: The bug that was quietly zeroing my best results
 *     date: 2026-07-14
 *     tags: [Evaluation, Engineering]
 *     summary: One or two sentences for the index and link previews.
 *     draft: false
 *     ---
 *
 *     The body starts here.
 *
 * Deliberately not a YAML parser. It handles `key: value`, inline lists in
 * square brackets, and booleans — which is everything a post needs, and it
 * fails obviously rather than subtly if you write something exotic.
 *
 * Used in two places, which is why it lives here rather than in a script:
 *   - scripts/build-posts.mjs, to generate content/posts.json
 *   - assets/js/pages/post.js, to strip the block before rendering
 */

const BLOCK = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function coerce(raw) {
    const value = raw.trim();

    if (value === "true") return true;
    if (value === "false") return false;

    /* Inline list: [a, b, c] — quotes optional. */
    if (value.startsWith("[") && value.endsWith("]")) {
        return value
            .slice(1, -1)
            .split(",")
            .map((item) => item.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
    }

    return value.replace(/^["']|["']$/g, "");
}

/**
 * @param {string} source  the full contents of a .md file
 * @returns {{ data: object, body: string }}  empty data if there is no block
 */
export function parseFrontmatter(source) {
    const text = String(source).replace(/\r\n/g, "\n");
    const match = text.match(BLOCK);

    if (!match) return { data: {}, body: text.replace(/^﻿/, "") };

    const data = {};

    match[1].split("\n").forEach((line) => {
        if (!line.trim() || line.trimStart().startsWith("#")) return;

        const separator = line.indexOf(":");
        if (separator === -1) return;

        const key = line.slice(0, separator).trim();
        if (key) data[key] = coerce(line.slice(separator + 1));
    });

    return { data, body: text.slice(match[0].length) };
}

/** Serialises a metadata object back into a frontmatter block. */
export function formatFrontmatter(data) {
    const lines = Object.entries(data).map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: [${value.join(", ")}]`;
        return `${key}: ${value}`;
    });

    return `---\n${lines.join("\n")}\n---\n`;
}
