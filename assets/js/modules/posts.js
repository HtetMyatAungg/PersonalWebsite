/**
 * posts.js — data access for the blog. Nothing else reads the content folder.
 *
 * Content model:
 *   content/posts.json         index of post metadata (the manifest)
 *   content/posts/<slug>.md    the body of each post
 *
 * Adding a post = drop a Markdown file in content/posts/ and add one entry to
 * the manifest. There is no build step.
 *
 * Note: fetch() needs a real HTTP origin, so open the site through a local
 * server (see DESIGN.md → Local development), not with a file:// path.
 *
 * Both URLs below are root-absolute and must stay that way: these fetches run
 * from the home page (depth 0), /writing/ (depth 1) and /writing/<slug>/
 * (depth 2). Written relative, the deeper pages would ask for
 * /writing/<slug>/content/posts.json and every post list would come up empty.
 */

const MANIFEST_URL = "/content/posts.json";

/** Newest first. */
function byNewest(a, b) {
    return new Date(b.date) - new Date(a.date);
}

/**
 * All published posts, newest first.
 * Entries marked "draft": true are omitted.
 */
export async function loadPosts() {
    const response = await fetch(MANIFEST_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load ${MANIFEST_URL} (${response.status})`);

    const manifest = await response.json();
    return manifest.filter((post) => !post.draft).sort(byNewest);
}

/** Raw Markdown for one post. */
export async function loadPostBody(slug) {
    const url = `/content/posts/${encodeURIComponent(slug)}.md`;
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
    return response.text();
}

/** Every tag used across the given posts, alphabetically. */
export function collectTags(posts) {
    const seen = new Set();
    posts.forEach((post) => (post.tags || []).forEach((tag) => seen.add(tag)));
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/** "2026-07-14" -> "14 July 2026" */
export function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Tags are lower-cased and hyphenated for use in data-tags / ?tag=. */
export function tagSlug(tag) {
    return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
