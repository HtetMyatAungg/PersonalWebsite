/**
 * comments/fallback.js — what a reader sees when no provider could mount.
 *
 * The site should never show an empty box or a broken widget. This panel gives
 * the reader somewhere to go, and tells you what to fix.
 */

import { links } from "../../config.js";

export function renderFallback(mount, info = {}) {
    const {
        headline = "Comments are unavailable right now.",
        detail = "",
        action = { label: "Open GitHub Discussions", href: `${links.repo}/discussions` },
    } = info;

    mount.innerHTML = `
        <div class="comments__fallback">
            <p><strong>${headline}</strong>${detail ? ` ${detail}` : ""}</p>
            <div class="row">
                <a class="btn btn--outline btn--sm" href="${action.href}" target="_blank" rel="noopener noreferrer">${action.label}</a>
                <a class="btn btn--ghost btn--sm" href="mailto:${links.email}">Email a reply</a>
            </div>
        </div>`;
}
