/**
 * post.js — the module every post page runs.
 *
 * Post pages are generated: scripts/build-posts.mjs writes one
 * writing/<slug>/index.html per post, each carrying its slug in
 * <body data-post-slug>. This module reads that slug, loads
 * content/posts/<slug>.md, and builds the body, table of contents, prev/next
 * pager and comment thread around it.
 *
 * The generated page already holds the real <title>, description and Open Graph
 * tags, so this module deliberately does NOT touch them — see renderHeader.
 */

import "../site.js";
import { site } from "../config.js";
import { loadPosts, loadPostBody, formatDate } from "../modules/posts.js";
import { parseFrontmatter } from "../modules/frontmatter.js";
import { renderMarkdown, extractHeadings, readingMinutes } from "../modules/markdown.js";
import { initComments } from "../modules/comments/index.js";

const dom = {
    header: document.querySelector("[data-post-header]"),
    body: document.querySelector("[data-post-body]"),
    toc: document.querySelector("[data-toc]"),
    pager: document.querySelector("[data-post-pager]"),
    comments: document.querySelector("[data-comments]"),
    progress: document.querySelector("[data-read-progress]"),
};

/**
 * Which post this page is.
 *
 * The generator bakes the slug into <body data-post-slug>, which is the markup
 * contract and is deterministic. The pathname fallback exists only so a
 * hand-copied folder still renders; it is not the primary path because pathname
 * parsing has to guess about trailing slashes and an explicit /index.html, and
 * it fails silently with the wrong slug rather than loudly.
 */
function currentSlug() {
    const baked = document.body.dataset.postSlug;
    if (baked) return baked;

    const parts = location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    return (last === "index.html" ? parts[parts.length - 2] : last) || "";
}

function showMessage(heading, detail) {
    if (dom.header) dom.header.innerHTML = `<h1 class="post-header__title">${heading}</h1>`;
    if (dom.body) {
        dom.body.innerHTML = `<p>${detail}</p><p><a class="link" href="/writing/">Back to all writing</a></p>`;
    }
    document.querySelectorAll("[data-hide-on-error]").forEach((el) => (el.hidden = true));
}

/**
 * Fills in the header. Note what this does NOT do: set document.title or the
 * description meta tag. The generated page already carries both as real HTML,
 * which is what makes link previews work — a crawler never runs this module.
 * Setting them here too would give the page two sources of truth for its title,
 * one of them invisible in the Elements panel, which is exactly how a share
 * preview ends up disagreeing with the browser tab. audit.mjs checks the
 * generated tags are current instead.
 */
function renderHeader(post, minutes) {
    const tags = (post.tags || []).map((tag) => `<span class="badge">${tag}</span>`).join("");

    dom.header.innerHTML = `
        <div class="row">${tags}</div>
        <h1 class="post-header__title">${post.title}</h1>
        <p class="post-header__summary">${post.summary || ""}</p>
        <div class="post-header__meta">
            <time datetime="${post.date}">${formatDate(post.date)}</time>
            <span>${minutes} min read</span>
            <span>${site.name}</span>
        </div>`;
}

function renderToc(markdown) {
    const headings = extractHeadings(markdown);

    if (!dom.toc || headings.length < 2) {
        if (dom.toc) dom.toc.closest(".post-aside")?.remove();
        return;
    }

    dom.toc.innerHTML = `
        <h2 class="toc__title">On this page</h2>
        <ul class="toc__list">
            ${headings
                .map(
                    (h) => `<li><a class="toc__link${h.level > 2 ? " toc__link--sub" : ""}"
                                 href="#${h.id}">${h.text}</a></li>`
                )
                .join("")}
        </ul>`;

    highlightActiveHeading(headings);
}

/** Marks the table-of-contents entry for the heading currently in view. */
function highlightActiveHeading(headings) {
    if (!("IntersectionObserver" in window)) return;

    const linkFor = new Map(
        headings.map((h) => [h.id, dom.toc.querySelector(`a[href="#${h.id}"]`)])
    );

    const observer = new IntersectionObserver(
        (entries) => {
            entries
                .filter((entry) => entry.isIntersecting)
                .forEach((entry) => {
                    linkFor.forEach((link) => link?.removeAttribute("aria-current"));
                    linkFor.get(entry.target.id)?.setAttribute("aria-current", "true");
                });
        },
        { rootMargin: "-20% 0px -70% 0px" }
    );

    headings.forEach((h) => {
        const target = document.getElementById(h.id);
        if (target) observer.observe(target);
    });
}

function renderPager(posts, index) {
    if (!dom.pager) return;

    /* posts is newest-first, so the *newer* post sits at a lower index. */
    const newer = posts[index - 1];
    const older = posts[index + 1];

    const link = (post, direction, label) =>
        post
            ? `<a class="pager__link${direction === "next" ? " pager__link--next" : ""}"
                  href="/writing/${encodeURIComponent(post.slug)}/">
                   <span class="pager__dir">${label}</span>
                   <span class="pager__title">${post.title}</span>
               </a>`
            : "";

    dom.pager.innerHTML =
        link(older, "prev", "Previous post") + link(newer, "next", "Next post");
}

/** Fills the progress bar in proportion to how much of the article is read. */
function initReadingProgress() {
    const article = dom.body?.closest("article");
    if (!dom.progress || !article) return;

    const update = () => {
        const start = article.offsetTop;
        const scrollable = article.offsetHeight - window.innerHeight;
        const progress = scrollable <= 0 ? 1 : (window.scrollY - start) / scrollable;
        dom.progress.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
}

async function render() {
    const slug = currentSlug();

    if (!slug) {
        showMessage("No post selected", "Pick something from the writing index.");
        return;
    }

    try {
        const posts = await loadPosts();
        const index = posts.findIndex((post) => post.slug === slug);

        if (index === -1) {
            showMessage("Post not found", `There is no published post with the slug “${slug}”.`);
            return;
        }

        const post = posts[index];

        /* The file carries its own frontmatter; the manifest was generated from
           it. Strip the block so it is not rendered as body text. */
        const { body: markdown } = parseFrontmatter(await loadPostBody(slug));

        renderHeader(post, post.minutes || readingMinutes(markdown));
        dom.body.innerHTML = renderMarkdown(markdown);
        renderToc(markdown);
        renderPager(posts, index);
        initReadingProgress();
        initComments(dom.comments, post);

        /* Jump to a #hash target now that the content it points at exists. */
        if (location.hash) {
            document.getElementById(location.hash.slice(1))?.scrollIntoView();
        }
    } catch (error) {
        showMessage("Could not load this post", error.message);
    }
}

render();
