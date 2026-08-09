/**
 * comments/index.js — chooses a comment provider and mounts it.
 *
 * Pages never import a provider directly. They call initComments() and this
 * module resolves `comments.provider` from config.js. Swapping GitHub
 * Discussions for a self-hosted backend later means adding one file here and
 * changing one string in config — no page, module, or stylesheet changes.
 *
 * See ./README.md for the provider contract.
 */

import { comments as config } from "../../config.js";
import { mountGiscus } from "./giscus.js";
import { renderFallback } from "./fallback.js";

/** provider name -> mount function. Add new providers here. */
const providers = {
    giscus: mountGiscus,
};

/**
 * @param {HTMLElement} mount  container to render into
 * @param {object} post        the post's manifest entry
 */
export function initComments(mount, post) {
    if (!mount) return;

    const provider = providers[config.provider];

    if (!provider) {
        renderFallback(mount, {
            headline: `No comment provider named “${config.provider}”.`,
            detail: `Set comments.provider in assets/js/config.js to one of: ${Object.keys(providers).join(", ")}.`,
        });
        return;
    }

    /* A provider returns { ok: true } once it has taken over the container, or
       { ok: false, headline, detail } to explain why it stood down. Never
       leaving an empty box is the whole point. */
    const result = provider(mount, post);
    if (!result?.ok) renderFallback(mount, result);
}
