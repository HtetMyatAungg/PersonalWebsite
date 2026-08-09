/**
 * audit.mjs — pre-push sanity check for the whole site.
 *
 *     npm run audit
 *
 * Catches the mistakes that are invisible locally but break the live site:
 * a missing .nojekyll, a link to a file that does not exist, a CSS class that
 * was never defined, a post file missing from the manifest.
 *
 * Static analysis only — it never starts a browser or a server.
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "../assets/js/modules/frontmatter.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let issues = 0;
const fail = (msg) => {
    issues += 1;
    console.log(`  ✗ ${msg}`);
};
const pass = (msg) => console.log(`  ✓ ${msg}`);

const SKIP_DIRS = new Set([".git", "node_modules", ".github"]);

function walk(dir = "", out = []) {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const rel = dir ? `${dir}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(rel, out);
        else out.push(rel);
    }
    return out;
}

const files = walk();
const pages = files.filter((f) => f.endsWith(".html"));
const scripts = files.filter((f) => f.endsWith(".js"));
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const stripComments = (t) =>
    t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");

const css = files.filter((f) => f.endsWith(".css")).map((f) => stripComments(read(f))).join("\n");

/* ── 1. Deployment guards ─────────────────────────────────────────────────── */
console.log("\nDeployment");

if (existsSync(join(ROOT, ".nojekyll"))) {
    pass(".nojekyll present (raw .md posts will be served)");
} else {
    fail(
        ".nojekyll is MISSING. GitHub Pages will run Jekyll, convert content/posts/*.md\n" +
            "    into .html, and every blog post will 404. Create an empty .nojekyll at the root."
    );
}

if (existsSync(join(ROOT, "CNAME"))) pass(`CNAME -> ${read("CNAME").trim()}`);
else fail("CNAME is missing; the custom domain will stop resolving.");

/* ── 2. Every referenced local file exists ────────────────────────────────── */
console.log("\nLinks and assets");
let brokenRefs = 0;
for (const page of pages) {
    for (const [, ref] of read(page).matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
        const target = ref.split(/[?#]/)[0];
        /* The brand's href="/" passes here: join(ROOT, "/") is ROOT itself. */
        if (!existsSync(join(ROOT, target))) {
            fail(`${page} -> "${target}" does not exist`);
            brokenRefs += 1;
        }
    }
}
if (!brokenRefs) pass(`all local references resolve across ${pages.length} pages`);

/* ── 3. Page scaffolding ──────────────────────────────────────────────────── */
console.log("\nPage structure");
let structureProblems = 0;
for (const page of pages) {
    const html = read(page);
    if (html.includes("http-equiv=\"refresh\"")) continue; // redirect stub

    const required = [
        ["assets/css/tokens.css", "tokens.css"],
        ["assets/css/base.css", "base.css"],
        ["assets/css/components.css", "components.css"],
        ["assets/css/pages.css", "pages.css"],
        ["data-site-header", "header mount"],
        ["data-site-footer", "footer mount"],
        ['localStorage.getItem("hma-theme")', "theme bootstrap"],
        ["<body data-page=", "body data-page"],
    ];

    for (const [needle, label] of required) {
        if (!html.includes(needle)) {
            fail(`${page} is missing its ${label}`);
            structureProblems += 1;
        }
    }
}
if (!structureProblems) pass("every page loads all four stylesheets and both mounts");

/* ── 4. CSS classes are defined ───────────────────────────────────────────── */
console.log("\nCSS");
const defined = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const ignore = new Set(["no-js", "giscus", "giscus-frame"]);
const used = new Set();

for (const file of [...pages, ...scripts]) {
    for (const [, list] of stripComments(read(file)).matchAll(/class="([^"]*)"/g)) {
        if (list.includes("${")) continue; // built from a template expression
        list.split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
    }
}

let undefinedClasses = 0;
for (const cls of [...used].sort()) {
    if (!defined.has(cls) && !ignore.has(cls) && !cls.startsWith("language-")) {
        fail(`class "${cls}" is used but never defined in CSS`);
        undefinedClasses += 1;
    }
}
if (!undefinedClasses) pass(`${used.size} classes used, all defined`);

const declaredVars = new Set([...css.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]));
const usedVars = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
const missingVars = [...usedVars].filter((v) => !declaredVars.has(v));
missingVars.forEach((v) => fail(`CSS token ${v} is used but never declared`));
if (!missingVars.length) pass(`${declaredVars.size} design tokens declared, none missing`);

/* ── 5. Blog content ──────────────────────────────────────────────────────── */
console.log("\nBlog");
const postsDir = join(ROOT, "content", "posts");
const postFiles = readdirSync(postsDir).filter((f) => f.endsWith(".md"));
const manifest = JSON.parse(read("content/posts.json"));
const slugs = new Set(manifest.map((p) => p.slug));

let contentProblems = 0;
for (const file of postFiles) {
    const slug = file.replace(/\.md$/, "");
    const { data } = parseFrontmatter(readFileSync(join(postsDir, file), "utf8"));

    if (!slugs.has(slug)) {
        fail(`${file} is not in posts.json — run \`npm run posts\``);
        contentProblems += 1;
    }
    for (const field of ["title", "date", "summary"]) {
        if (!data[field]) {
            fail(`${file} frontmatter has no ${field}`);
            contentProblems += 1;
        }
    }
}
for (const post of manifest) {
    if (!postFiles.includes(`${post.slug}.md`)) {
        fail(`posts.json lists "${post.slug}" but content/posts/${post.slug}.md is gone`);
        contentProblems += 1;
    }
}
if (!contentProblems) {
    const drafts = manifest.filter((p) => p.draft).length;
    pass(`${manifest.length} posts in sync${drafts ? ` (${drafts} draft)` : ""}`);
}

/* ── 6. Leftovers ─────────────────────────────────────────────────────────── */
console.log("\nHygiene");
let leftovers = 0;
for (const file of [...pages, ...scripts]) {
    const text = read(file);
    for (const [, style] of text.matchAll(/ style="([^"]*)"/g)) {
        fail(`${file} has an inline style: ${style} — move it to CSS`);
        leftovers += 1;
    }
    if (/\bTODO\b|\bFIXME\b/.test(text)) {
        fail(`${file} contains a TODO/FIXME`);
        leftovers += 1;
    }
}

for (const media of files.filter((f) => f.startsWith("assets/media/"))) {
    const base = media.split("/").pop();
    const referenced = [...pages, ...scripts].some((f) => read(f).includes(base));
    if (!referenced) {
        const kb = Math.round(statSync(join(ROOT, media)).size / 1024);
        fail(`${media} (${kb} KB) is not referenced anywhere — delete it or use it`);
        leftovers += 1;
    }
}
if (!leftovers) pass("no inline styles, TODOs, or orphaned media");

/* ── Result ───────────────────────────────────────────────────────────────── */
console.log(
    issues
        ? `\n${issues} issue(s) to fix before pushing.\n`
        : "\nAudit clean — safe to push.\n"
);
process.exitCode = issues ? 1 : 0;
