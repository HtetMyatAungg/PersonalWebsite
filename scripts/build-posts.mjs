/**
 * build-posts.mjs — regenerates content/posts.json from the post files.
 *
 *     npm run posts
 *
 * Each post carries its own metadata in a frontmatter block, so the manifest
 * is derived, never hand-edited. Writing a post means creating one file.
 *
 * The manifest is still committed to the repository: the site itself has no
 * build step, and GitHub Pages serves exactly what is in the repo. This script
 * (and the workflow in .github/workflows/posts.yml) just keeps it in sync.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "../assets/js/modules/frontmatter.js";
import { readingMinutes } from "../assets/js/modules/markdown.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = join(ROOT, "content", "posts");
const MANIFEST = join(ROOT, "content", "posts.json");

const REQUIRED = ["title", "date", "summary"];

const problems = [];
const posts = [];

for (const file of readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    const { data, body } = parseFrontmatter(readFileSync(join(POSTS_DIR, file), "utf8"));

    const missing = REQUIRED.filter((key) => !data[key]);
    if (missing.length) {
        problems.push(`${file}: missing ${missing.join(", ")} in the frontmatter block`);
        continue;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) {
        problems.push(`${file}: date "${data.date}" should be YYYY-MM-DD`);
        continue;
    }

    if (!body.trim()) {
        problems.push(`${file}: has no body text`);
        continue;
    }

    if (/^#\s/m.test(body)) {
        problems.push(
            `${file}: starts a heading with a single "#". The title comes from the frontmatter — use "##" for sections.`
        );
    }

    posts.push({
        slug,
        title: data.title,
        date: data.date,
        minutes: readingMinutes(body),
        summary: data.summary,
        tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
        ...(data.draft === true ? { draft: true } : {}),
    });
}

if (problems.length) {
    console.error("Could not build the manifest:\n");
    problems.forEach((p) => console.error("  - " + p));
    console.error("\nNothing was written. Fix the above and run again.");
    process.exit(1);
}

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

const json = JSON.stringify(posts, null, 4) + "\n";
const unchanged = (() => {
    try {
        return readFileSync(MANIFEST, "utf8") === json;
    } catch {
        return false;
    }
})();

if (unchanged) {
    console.log(`content/posts.json is already up to date (${posts.length} posts).`);
    process.exit(0);
}

writeFileSync(MANIFEST, json, "utf8");

const drafts = posts.filter((p) => p.draft).length;
console.log(`Wrote content/posts.json — ${posts.length} posts${drafts ? `, ${drafts} draft` : ""}.`);
posts.forEach((p) => console.log(`  ${p.date}  ${p.draft ? "[draft] " : ""}${p.title}`));
