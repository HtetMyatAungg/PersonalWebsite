/**
 * build-posts.mjs — regenerates content/posts.json AND the per-post pages.
 *
 *     npm run posts
 *
 * Each post carries its own metadata in a frontmatter block, so both outputs
 * are derived, never hand-edited. Writing a post means creating one file.
 *
 * Two things are generated:
 *
 *   content/posts.json          the index every page reads with fetch()
 *   writing/<slug>/index.html   one real page per post, served at /writing/<slug>/
 *
 * The per-post pages exist because a URL needs a file behind it. There is no
 * server to rewrite /writing/foo/ onto a single template, and relying on one
 * would break local preview — a folder with an index.html is the only shape
 * every static server resolves. They also carry real <title>, description and
 * Open Graph tags, which is what makes link previews work: those used to be set
 * by JavaScript, so crawlers only ever saw the generic fallback.
 *
 * Both outputs are committed to the repository: the site has no build step, and
 * GitHub Pages serves exactly what is in the repo, so nothing may depend on this
 * script having run. It (and .github/workflows/posts.yml) just keeps them in
 * sync.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "../assets/js/modules/frontmatter.js";
import { readingMinutes } from "../assets/js/modules/markdown.js";
import { site } from "../assets/js/config.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = join(ROOT, "content", "posts");
const MANIFEST = join(ROOT, "content", "posts.json");
const WRITING_DIR = join(ROOT, "writing");
const ORIGIN = `https://${site.domain}`;

const REQUIRED = ["title", "date", "summary"];

const problems = [];
const posts = [];
/* slug -> old slugs that must keep working, from the `aliases:` frontmatter.
   Kept out of the manifest: the browser never needs them, only the generator. */
const aliasesOf = new Map();

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

    const aliases = Array.isArray(data.aliases) ? data.aliases : data.aliases ? [data.aliases] : [];
    if (aliases.includes(slug)) {
        problems.push(`${file}: lists its own slug in aliases — remove it`);
        continue;
    }
    if (aliases.length) aliasesOf.set(slug, aliases);

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

/* Two posts cannot claim the same URL, and an alias cannot shadow a real post. */
const claimed = new Map();
for (const post of posts) claimed.set(post.slug, post.slug);
for (const [slug, aliases] of aliasesOf) {
    for (const alias of aliases) {
        if (claimed.has(alias)) {
            problems.push(
                `${slug}: alias "${alias}" is already the URL of ${claimed.get(alias)}`
            );
        }
        claimed.set(alias, `${slug} (alias)`);
    }
}

if (problems.length) {
    console.error("Could not build the manifest:\n");
    problems.forEach((p) => console.error("  - " + p));
    console.error("\nNothing was written. Fix the above and run again.");
    process.exit(1);
}

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

/* ── The manifest ─────────────────────────────────────────────────────────── */

const json = JSON.stringify(posts, null, 4) + "\n";
let wroteManifest = false;

if (readIfExists(MANIFEST) !== json) {
    writeFileSync(MANIFEST, json, "utf8");
    wroteManifest = true;
}

/* ── The per-post pages ───────────────────────────────────────────────────── */

const published = posts.filter((post) => !post.draft);
const written = [];
const removed = [];

mkdirSync(WRITING_DIR, { recursive: true });

for (const post of published) {
    writePage(post.slug, postPageHtml(post));
    for (const alias of aliasesOf.get(post.slug) || []) {
        writePage(alias, aliasPageHtml(post, alias));
    }
}

/* Prune folders that no longer correspond to a published post or alias. A post
   that was deleted, renamed, or turned back into a draft must not leave a live
   URL behind. */
const keep = new Set(published.flatMap((p) => [p.slug, ...(aliasesOf.get(p.slug) || [])]));

for (const entry of readdirSync(WRITING_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || keep.has(entry.name)) continue;

    const inside = readdirSync(join(WRITING_DIR, entry.name));
    /* Only ever delete a folder this script could have created. Anything with
       other files in it is someone's hand-made page — leave it and say so. */
    if (inside.length === 1 && inside[0] === "index.html") {
        rmSync(join(WRITING_DIR, entry.name), { recursive: true });
        removed.push(entry.name);
    } else {
        console.warn(`  ! writing/${entry.name}/ is not a generated post page — left alone.`);
    }
}

/* ── Report ───────────────────────────────────────────────────────────────── */

const drafts = posts.length - published.length;

if (wroteManifest) {
    console.log(`Wrote content/posts.json — ${posts.length} posts${drafts ? `, ${drafts} draft` : ""}.`);
} else {
    console.log(`content/posts.json is already up to date (${posts.length} posts).`);
}

written.forEach((slug) => console.log(`  + writing/${slug}/`));
removed.forEach((slug) => console.log(`  - writing/${slug}/  (pruned)`));

if (!written.length && !removed.length) {
    console.log(`${published.length} post pages already up to date.`);
}

posts.forEach((p) => console.log(`  ${p.date}  ${p.draft ? "[draft] " : ""}${p.title}`));

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function readIfExists(file) {
    try {
        return readFileSync(file, "utf8");
    } catch {
        return null;
    }
}

/** Writes writing/<slug>/index.html, but only when the bytes actually change. */
function writePage(slug, html) {
    const dir = join(WRITING_DIR, slug);
    const file = join(dir, "index.html");
    if (existsSync(file) && readFileSync(file, "utf8") === html) return;
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, html, "utf8");
    written.push(slug);
}

/** Frontmatter is author-controlled, but it still lands inside an attribute. */
function attr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * One post page.
 *
 * The <head> is post.html's, with the placeholder title and description
 * replaced by the real ones — that is the whole point of generating these.
 * The theme-bootstrap snippet must stay byte-identical to every other page's:
 * audit.mjs needle-matches it, and it has to run before first paint.
 *
 * The body is post.html's markup verbatim. Every data- hook post.js looks for
 * has to survive: data-post-header, data-post-body, data-toc, data-post-pager,
 * data-comments, data-read-progress, data-hide-on-error.
 */
function postPageHtml(post) {
    const url = `${ORIGIN}/writing/${post.slug}/`;

    return `<!DOCTYPE html>
<html lang="en" class="no-js" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- GENERATED by scripts/build-posts.mjs from content/posts/${post.slug}.md
         Do not edit: \`npm run posts\` overwrites this file. -->
    <title>${attr(post.title)} — ${attr(site.name)}</title>
    <meta name="description" content="${attr(post.summary)}">
    <meta name="author" content="${attr(site.name)}">
    <link rel="canonical" href="${url}">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${attr(post.title)}">
    <meta property="og:description" content="${attr(post.summary)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${ORIGIN}/assets/media/portrait.png">
    <meta property="article:published_time" content="${attr(post.date)}">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="icon" type="image/png" href="/assets/media/icon.png">

    <script>
        (function () {
            var root = document.documentElement;
            root.classList.remove("no-js");
            try {
                var stored = localStorage.getItem("hma-theme");
                root.dataset.theme = stored
                    || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
            } catch (e) { root.dataset.theme = "dark"; }
        })();
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..600&family=JetBrains+Mono:wght@400;500&family=Newsreader:ital,wght@0,300..600;1,400&display=swap">

    <link rel="stylesheet" href="/assets/css/tokens.css">
    <link rel="stylesheet" href="/assets/css/base.css">
    <link rel="stylesheet" href="/assets/css/components.css">
    <link rel="stylesheet" href="/assets/css/pages.css">
</head>

<body data-page="writing" data-post-slug="${attr(post.slug)}">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header" data-site-header></header>
    <div class="read-progress" data-read-progress role="presentation"></div>

    <main id="main">
        <div class="container section--tight">
            <p><a class="link" href="/writing/">&larr; All writing</a></p>
        </div>

        <div class="container section--tight">
            <div class="post-layout">

                <article>
                    <!-- Seeded with the real title so it is in the HTML and there
                         is no flash before the fetch resolves. post.js replaces
                         this with the same markup plus the tag badges. -->
                    <header class="post-header" data-post-header>
                        <h1 class="post-header__title">${attr(post.title)}</h1>
                        <p class="post-header__summary">${attr(post.summary)}</p>
                    </header>

                    <div class="prose" data-post-body></div>

                    <footer class="post-footer" data-hide-on-error>
                        <nav class="pager" data-post-pager aria-label="Other posts"></nav>

                        <section class="comments">
                            <div class="comments__head">
                                <h2>Comments</h2>
                                <p class="comments__note">
                                    Comments are threads on GitHub Discussions. Sign in with a GitHub
                                    account to reply — corrections especially welcome.
                                </p>
                            </div>
                            <div data-comments></div>
                        </section>
                    </footer>
                </article>

                <aside class="post-aside">
                    <nav class="toc" data-toc aria-label="Table of contents"></nav>
                </aside>

            </div>
        </div>
    </main>

    <footer class="site-footer" data-site-footer></footer>
    <script type="module" src="/assets/js/pages/post.js"></script>
</body>
</html>
`;
}

/**
 * A redirect stub for a post's former slug, so renaming a post never kills a
 * link someone already shared. Same shape as the root-level stubs: the script
 * carries the fragment across, the meta refresh is the no-JS fallback.
 */
function aliasPageHtml(post, alias) {
    const url = `${ORIGIN}/writing/${post.slug}/`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!-- GENERATED by scripts/build-posts.mjs — the \`aliases:\` frontmatter of
         content/posts/${post.slug}.md lists "${alias}" as a former slug.
         Do not edit: \`npm run posts\` overwrites this file. -->
    <title>Moved to /writing/${attr(post.slug)}/ — ${attr(site.name)}</title>
    <meta name="robots" content="noindex">
    <link rel="canonical" href="${url}">
    <meta http-equiv="refresh" content="1; url=/writing/${attr(post.slug)}/">
    <script>location.replace("/writing/${post.slug}/" + location.hash);</script>
</head>
<body>
    <p>This post is now at <a href="/writing/${attr(post.slug)}/">/writing/${attr(post.slug)}/</a>.</p>
</body>
</html>
`;
}
