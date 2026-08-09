/**
 * check-comments.mjs — tells you exactly what is left to switch comments on.
 *
 *     npm run check:comments
 *
 * Reads config.js, asks the public GitHub API what state the repository is in,
 * and prints the remaining steps. Read-only: it changes nothing.
 */

import { comments } from "../assets/js/config.js";

const tick = (ok) => (ok ? "  [x]" : "  [ ]");
const steps = [];

console.log(`\nComment provider: ${comments.provider}\n`);

/* Set process.exitCode rather than calling process.exit(): on Windows, exiting
   while fetch's keep-alive socket is still open trips a libuv assertion. */
if (comments.provider !== "giscus") {
    console.log("Not giscus — nothing for this script to check.\n");
    process.exitCode = 0;
}

let repo;
try {
    const response = await fetch(`https://api.github.com/repos/${comments.repo}`);
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    repo = await response.json();
} catch (error) {
    console.error(`Could not reach the GitHub API: ${error.message}`);
    console.error("Check your connection, or the repo name in config.js.\n");
    process.exit(1);
}

// 1 — the repository must be public, or readers cannot see the threads.
const isPublic = repo.visibility === "public";
console.log(`${tick(isPublic)} Repository is public (${repo.visibility})`);
if (!isPublic) steps.push("Make the repository public, or nobody can read or post comments.");

// 2 — Discussions must be enabled.
console.log(`${tick(repo.has_discussions)} Discussions enabled on ${comments.repo}`);
if (!repo.has_discussions) {
    steps.push(
        `Enable Discussions:\n       https://github.com/${comments.repo}/settings\n       Settings -> General -> Features -> tick "Discussions"`
    );
}

// 3 — repoId must match the live repository, not a stale copy.
const repoIdOk = comments.repoId === repo.node_id;
console.log(`${tick(repoIdOk)} repoId matches the repository (${repo.node_id})`);
if (!repoIdOk) {
    steps.push(`Set repoId to "${repo.node_id}" in assets/js/config.js.`);
}

// 4 — categoryId can only be read from giscus.app once the app is installed.
const hasCategory = Boolean(comments.categoryId);
console.log(`${tick(hasCategory)} categoryId set (category: "${comments.category}")`);
if (!hasCategory) {
    steps.push(
        "Install the giscus app on this repository:\n       https://github.com/apps/giscus"
    );
    steps.push(
        `Get the category ID:\n       https://giscus.app  ->  enter "${comments.repo}"\n       choose the "${comments.category}" category, then copy data-category-id\n       into comments.categoryId in assets/js/config.js`
    );
}

if (!steps.length) {
    console.log(`
All set. Comments are live on every post.

  Threads appear at: https://github.com/${comments.repo}/discussions
  Moderate by editing or deleting the discussion.
`);
    process.exit(0);
}

console.log(`\n${steps.length} step(s) left:\n`);
steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}\n`));
console.log("Until then, posts show a fallback panel instead of a broken widget.\n");
