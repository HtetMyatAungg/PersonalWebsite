/**
 * home.js — entry module for index.html.
 * Fills the skills marquee from config and the latest-writing block from the
 * blog manifest, so neither has to be kept up to date by hand in the markup.
 */

import "../site.js";
import { skillGroups } from "../config.js";
import { loadPosts } from "../modules/posts.js";
import { postCardMarkup } from "../modules/post-card.js";
import { initReveal } from "../modules/reveal.js";

const LATEST_COUNT = 3;

/** Two identical tracks side by side make the scroll loop seamless. */
function renderMarquee() {
    const marquee = document.querySelector("[data-marquee]");
    if (!marquee) return;

    const items = skillGroups
        .flatMap((group) => group.items)
        .map((item) => `<span class="marquee__item">${item}</span>`)
        .join("");

    marquee.innerHTML = `
        <div class="marquee__track">${items}</div>
        <div class="marquee__track" aria-hidden="true">${items}</div>`;
}

async function renderLatestPosts() {
    const list = document.querySelector("[data-latest-posts]");
    if (!list) return;

    try {
        const posts = await loadPosts();
        if (!posts.length) {
            list.innerHTML = `<p class="empty-state">No posts published yet.</p>`;
            return;
        }
        list.innerHTML = posts
            .slice(0, LATEST_COUNT)
            .map((post, i) => postCardMarkup(post, i))
            .join("");
        initReveal(list);
    } catch {
        /* The rest of the page is unaffected; just point at the blog index. */
        list.innerHTML = `<p class="empty-state">Writing is over on the <a class="link" href="blog.html">Writing</a> page.</p>`;
    }
}

renderMarquee();
renderLatestPosts();
