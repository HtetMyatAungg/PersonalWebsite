/**
 * comments.js — reader comments on blog posts, via giscus.
 *
 * Comments are stored as GitHub Discussions on the site's own repository. That
 * keeps the site fully static (no server, no database) while giving real
 * threads, replies, reactions, edit history, moderation, and spam handling for
 * free. Readers sign in with GitHub to post.
 *
 * Until repoId / categoryId are filled in (see config.js → comments), this
 * renders a fallback panel instead of failing silently. DESIGN.md → Comments
 * has the four-step setup.
 */

import { comments as config, links } from "../config.js";
import { THEME_CHANGE_EVENT, currentTheme } from "./theme.js";

const GISCUS_ORIGIN = "https://giscus.app";

function isConfigured() {
    return Boolean(config.repo && config.repoId && config.categoryId);
}

/** Our theme names happen to match giscus's built-in themes. */
function giscusTheme() {
    return currentTheme() === "light" ? "light" : "dark";
}

/** giscus listens for setConfig messages, so the widget follows the toggle. */
function forwardThemeChanges() {
    document.addEventListener(THEME_CHANGE_EVENT, () => {
        const frame = document.querySelector("iframe.giscus-frame");
        frame?.contentWindow?.postMessage(
            { giscus: { setConfig: { theme: giscusTheme() } } },
            GISCUS_ORIGIN
        );
    });
}

function fallbackMarkup() {
    return `
    <div class="comments__fallback">
        <p><strong>Comments are not switched on yet.</strong> They run on GitHub
        Discussions — until the repository IDs are added to
        <code>assets/js/config.js</code>, use one of these instead.</p>
        <div class="row">
            <a class="btn btn--outline btn--sm" href="${links.repo}/discussions" target="_blank" rel="noopener noreferrer">Open GitHub Discussions</a>
            <a class="btn btn--ghost btn--sm" href="mailto:${links.email}">Email a reply</a>
        </div>
    </div>`;
}

/**
 * Mounts the comment widget.
 * @param {HTMLElement} mount   container to render into
 * @param {string} term         discussion term, used when mapping is "specific"
 */
export function initComments(mount, term) {
    if (!mount) return;

    if (!isConfigured()) {
        mount.innerHTML = fallbackMarkup();
        return;
    }

    const script = document.createElement("script");
    script.src = `${GISCUS_ORIGIN}/client.js`;
    script.async = true;
    script.crossOrigin = "anonymous";

    Object.entries({
        "data-repo": config.repo,
        "data-repo-id": config.repoId,
        "data-category": config.category,
        "data-category-id": config.categoryId,
        "data-mapping": config.mapping,
        "data-term": term || "",
        "data-strict": "1",
        "data-reactions-enabled": "1",
        "data-emit-metadata": "0",
        "data-input-position": "top",
        "data-theme": giscusTheme(),
        "data-lang": config.lang,
        "data-loading": "lazy",
    }).forEach(([key, value]) => script.setAttribute(key, value));

    mount.replaceChildren(script);
    forwardThemeChanges();
}
