/**
 * post.js — entry module for post.html, which renders any single post.
 *
 * There is one post *page*, not one page per post: post.html?p=<slug> loads
 * content/posts/<slug>.md, renders it, and builds the table of contents,
 * prev/next pager and comment thread around it.
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

function slugFromUrl() {
    return new URLSearchParams(location.search).get("p") || "";
}

function showMessage(heading, detail) {
    if (dom.header) dom.header.innerHTML = `<h1 class="post-header__title">${heading}</h1>`;
    if (dom.body) {
        dom.body.innerHTML = `<p>${detail}</p><p><a class="link" href="blog.html">Back to all writing</a></p>`;
    }
    document.querySelectorAll("[data-hide-on-error]").forEach((el) => (el.hidden = true));
}

function renderHeader(post, minutes) {
    document.title = `${post.title} — ${site.name}`;
    document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", post.summary || "");

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
                  href="post.html?p=${encodeURIComponent(post.slug)}">
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
    const slug = slugFromUrl();

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
