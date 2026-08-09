/**
 * new-post.mjs — scaffolds a post and rebuilds the manifest.
 *
 *     npm run new "A rule and a lookup table look identical"
 *     npm run new "Draft thoughts on evaluation" -- --draft
 *
 * Creates content/posts/<slug>.md with the frontmatter already filled in, then
 * regenerates content/posts.json so the post is live locally straight away.
 */

import { existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { formatFrontmatter } from "../assets/js/modules/frontmatter.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const draft = args.includes("--draft");
const title = args.filter((a) => !a.startsWith("--")).join(" ").trim();

if (!title) {
    console.error('Usage: npm run new "Your post title"  [-- --draft]');
    process.exit(1);
}

const slug = title
    .toLowerCase()
    .replace(/['‘’"“”]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const file = join(ROOT, "content", "posts", `${slug}.md`);

if (existsSync(file)) {
    console.error(`content/posts/${slug}.md already exists. Pick a different title.`);
    process.exit(1);
}

/* Local date, not UTC — a post written late at night should carry today. */
const today = new Date();
const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
].join("-");

const template =
    formatFrontmatter({
        title,
        date,
        tags: ["Interpretability"],
        summary: "One or two sentences. This is what shows on the index and in link previews.",
        draft,
    }) +
    `
Opening paragraph. Say the thing the post is about in the first two sentences —
the index already showed the reader your summary, so do not repeat it.

## First section

Body text. Available: **bold**, *italic*, \`inline code\`, [links](https://example.com),
bullet and numbered lists, > blockquotes, pipe tables, and fenced code blocks:

\`\`\`python
def example():
    return "syntax highlighting is not enabled, but the block is styled"
\`\`\`

## Second section

Headings start at "##" — the title above becomes the page's h1, and any heading
at "##" or "###" is picked up automatically into the table of contents.
`;

writeFileSync(file, template, "utf8");
console.log(`Created content/posts/${slug}.md`);

execFileSync(process.execPath, [join(ROOT, "scripts", "build-posts.mjs")], { stdio: "inherit" });

console.log(`
Next:
  1. npm run dev
  2. open http://localhost:8000/post.html?p=${slug}
  3. write, save, refresh${draft ? "\n  4. remove `draft: true` when it is ready to publish" : ""}
`);
