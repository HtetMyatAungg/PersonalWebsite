/**
 * blog.js — entry module for blog.html.
 *
 * Renders the post list and its tag chips from content/posts.json, then hands
 * filtering over to the shared filter engine. Adding a post never requires
 * touching this file or blog.html.
 */

import "../site.js";
import { loadPosts, collectTags, tagSlug } from "../modules/posts.js";
import { postCardMarkup } from "../modules/post-card.js";
import { initFilterBar } from "../modules/filters.js";
import { initReveal } from "../modules/reveal.js";

const root = document.querySelector("[data-filter-root]");
const list = document.querySelector("[data-filter-list]");
const chips = document.querySelector("[data-filter-chips]");

function chipMarkup(label, tag, pressed = false) {
    return `<button class="filter-chip" type="button" data-filter="${tag}" aria-pressed="${pressed}">
        ${label}<span class="filter-chip__count"></span>
    </button>`;
}

async function render() {
    if (!root || !list) return;

    try {
        const posts = await loadPosts();

        if (!posts.length) {
            list.innerHTML = `<p class="empty-state">No posts published yet — check back soon.</p>`;
            return;
        }

        list.innerHTML = posts.map((post, i) => postCardMarkup(post, i)).join("");

        if (chips) {
            chips.innerHTML = [
                chipMarkup("All", "all", true),
                ...collectTags(posts).map((tag) => chipMarkup(tag, tagSlug(tag))),
            ].join("");
        }

        /* Chips and cards must both exist before the filter engine binds. */
        initFilterBar(root);
        initReveal(list);
    } catch (error) {
        list.innerHTML = `<p class="empty-state">
            Could not load the post index.<br>
            <span class="result-count">${error.message}</span>
        </p>`;
    }
}

render();
