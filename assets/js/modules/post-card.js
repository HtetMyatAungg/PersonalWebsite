/**
 * post-card.js — the one markup definition for a post summary.
 * Shared by the blog index and the "Latest writing" block on the home page.
 */

import { formatDate, tagSlug } from "./posts.js";

/**
 * @param {object} post   manifest entry
 * @param {number} index  position in the list, used to stagger the reveal
 * @returns {string} HTML for one post card
 */
export function postCardMarkup(post, index = 0) {
    const tags = post.tags || [];
    const meta = [
        `<time datetime="${post.date}">${formatDate(post.date)}</time>`,
        post.minutes ? `<span>${post.minutes} min read</span>` : "",
        tags.length ? `<span>${tags[0]}</span>` : "",
    ]
        .filter(Boolean)
        .join("");

    /* data-tags drives the filter chips; data-search widens free-text search
       to include tag names that are not shown in the card body. */
    return `
    <a class="post-card reveal" href="post.html?p=${encodeURIComponent(post.slug)}"
       data-tags="${tags.map(tagSlug).join(" ")}"
       data-search="${tags.join(" ")}"
       data-reveal-delay="${index * 60}">
        <span class="post-card__meta">${meta}</span>
        <h3 class="post-card__title">${post.title}</h3>
        <p class="post-card__summary">${post.summary}</p>
    </a>`;
}
