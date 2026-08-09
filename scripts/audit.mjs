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
import { site, nav, links } from "../assets/js/config.js";

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

/* Nothing links to 404.html — GitHub Pages finds it by that exact name — so the
   link checker below can never notice it disappearing. */
if (existsSync(join(ROOT, "404.html"))) pass("404.html present at the root");
else fail("404.html is missing; GitHub Pages will serve its own generic page.");

/* index.html at the root IS the home page: "/" resolves to it, and the brand in
   every header points there. */
if (existsSync(join(ROOT, "index.html"))) pass("index.html present at the root");
else fail('index.html is missing; "/" and every brand link will 404.');

/* ── 2. Every referenced local file exists, and the URL convention holds ──── */
console.log("\nLinks and assets");

const EXTERNAL = /^(https?:|mailto:|tel:|data:|#)/;

/**
 * Does a reference point at something servable?
 *
 * "/research/" is a directory, and a directory URL only works if it holds an
 * index.html — that is the whole basis of the site's URL scheme, so it is
 * checked rather than assumed.
 */
function resolves(ref, pageDir) {
    const target = ref.split(/[?#]/)[0];
    if (!target) return true; // pure "#anchor" or "?query"

    const abs = ref.startsWith("/")
        ? join(ROOT, target.slice(1))
        : join(ROOT, pageDir, target);

    if (!existsSync(abs)) return false;
    if (statSync(abs).isDirectory()) return existsSync(join(abs, "index.html"));
    return true;
}

let brokenRefs = 0;
let conventionBreaks = 0;

for (const page of pages) {
    const pageDir = dirname(page) === "." ? "" : dirname(page);
    const html = read(page);

    /* href/src, plus the url= inside a redirect stub's meta refresh — that one
       is a real navigation target but is not an href, so it would otherwise go
       completely unchecked. */
    const refs = [
        ...[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/http-equiv="refresh"[^>]*url=([^"']+)"/g)].map((m) => m[1]),
    ];

    for (const ref of refs) {
        if (EXTERNAL.test(ref)) continue;

        /* Pages live in folders, so a relative path means a different thing on
           every page. Root-absolute is the only shape that is the same at every
           depth — see DESIGN.md §2, "URLs are folders". */
        if (!ref.startsWith("/")) {
            fail(`${page} -> "${ref}" is relative; start it with "/"`);
            conventionBreaks += 1;
        }

        /* Linking the file rather than the folder still works, which is exactly
           why nothing else would ever complain about it. */
        if (/\.html(?:[?#]|$)/.test(ref)) {
            fail(`${page} -> "${ref}" links to a .html file; link to the folder instead`);
            conventionBreaks += 1;
        }

        if (!resolves(ref, pageDir)) {
            fail(`${page} -> "${ref}" does not resolve (missing file, or folder with no index.html)`);
            brokenRefs += 1;
        }
    }
}

if (!brokenRefs) pass(`all local references resolve across ${pages.length} pages`);
if (!conventionBreaks) pass("every internal link is root-absolute and extensionless");

/* URLs held as data in config.js are never written as href="…", so the scan
   above cannot see them — and links.cv is the one that breaks silently, being
   rendered by JS into the header of every page. */
let configBreaks = 0;
for (const item of nav) {
    if (!/^\/[a-z0-9-]+\/$/.test(item.href)) {
        fail(`config.js nav "${item.label}" should be a folder URL like "/research/" — got "${item.href}"`);
        configBreaks += 1;
    }
}
if (!links.cv.startsWith("/")) {
    fail(`config.js links.cv must be root-absolute or it 404s on every page but the home page — got "${links.cv}"`);
    configBreaks += 1;
}
if (!configBreaks) pass("config.js nav and CV URLs follow the convention");

/* ── 3. Page scaffolding ──────────────────────────────────────────────────── */
console.log("\nPage structure");
let structureProblems = 0;
for (const page of pages) {
    const html = read(page);
    if (html.includes("http-equiv=\"refresh\"")) continue; // redirect stub

    /* Leading slashes are deliberate: these needles double as a root-absolute
       assertion, so a page that slipped back to a relative stylesheet path
       fails here even though the file itself exists. */
    const required = [
        ["/assets/css/tokens.css", "tokens.css"],
        ["/assets/css/base.css", "base.css"],
        ["/assets/css/components.css", "components.css"],
        ["/assets/css/pages.css", "pages.css"],
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

/* Paths that JS writes into the DOM never appear as a literal href="…" in any
   page, so section 2 cannot see them. posts.js's two fetches are the ones that
   matter most: get those wrong and every post list silently comes up empty. */
let scriptPathProblems = 0;
for (const file of scripts) {
    const text = stripComments(read(file));

    /* href/src written literally, skipping template expressions and schemes. */
    for (const [, ref] of text.matchAll(
        /(?:href|src)="(?!\/|https?:|mailto:|#|\$\{)([^"]+)"/g
    )) {
        fail(`${file} emits a relative "${ref}" — pages live in folders, so start it with "/"`);
        scriptPathProblems += 1;
    }

    /* fetch targets and other asset paths written as bare string literals. */
    for (const [match] of text.matchAll(/["'`](?:assets|content)\//g)) {
        fail(`${file} has a relative path starting ${match.slice(1)}… — start it with "/"`);
        scriptPathProblems += 1;
    }
}
if (!scriptPathProblems) pass("no relative paths emitted from JavaScript");

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

/* Generated post pages.
 *
 * These checks are what make it safe for post.js NOT to set document.title:
 * the title lives only in the generated HTML now, so something has to notice
 * when it goes stale. Nothing else would — a stale page still renders perfectly,
 * it just shares the wrong headline everywhere it is linked. */
let generatedProblems = 0;
const published = manifest.filter((post) => !post.draft);

/* Every alias declared in frontmatter must also have a folder. */
const expected = new Map();
for (const post of published) {
    expected.set(post.slug, post);
    const { data } = parseFrontmatter(readFileSync(join(postsDir, `${post.slug}.md`), "utf8"));
    const aliases = Array.isArray(data.aliases) ? data.aliases : data.aliases ? [data.aliases] : [];
    aliases.forEach((alias) => expected.set(alias, null)); // null = redirect stub
}

for (const [slug, post] of expected) {
    const file = `writing/${slug}/index.html`;
    if (!pages.includes(file)) {
        fail(`${file} is missing — run \`npm run posts\``);
        generatedProblems += 1;
        continue;
    }

    const html = read(file);

    if (post === null) {
        if (!html.includes('http-equiv="refresh"')) {
            fail(`${file} should be a redirect stub for a former slug — run \`npm run posts\``);
            generatedProblems += 1;
        }
        continue;
    }

    const checks = [
        [`data-post-slug="${post.slug}"`, "data-post-slug"],
        [`<title>${post.title} — ${site.name}</title>`, "title"],
        [`content="${post.summary}"`, "description"],
        [`href="https://${site.domain}/writing/${post.slug}/"`, "canonical"],
    ];
    for (const [needle, label] of checks) {
        if (!html.includes(needle)) {
            fail(`${file} has a stale or missing ${label} — run \`npm run posts\``);
            generatedProblems += 1;
        }
    }
}

/* And nothing may live under writing/ that no longer has a post behind it. */
for (const entry of readdirSync(join(ROOT, "writing"), { withFileTypes: true })) {
    if (entry.isDirectory() && !expected.has(entry.name)) {
        fail(`writing/${entry.name}/ has no published post — run \`npm run posts\` to prune it`);
        generatedProblems += 1;
    }
}

if (!generatedProblems) pass(`${published.length} generated post pages current`);

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
