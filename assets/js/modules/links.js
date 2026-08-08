/**
 * links.js — fills in hrefs from config so no URL is written twice.
 *
 * Markup contract: give an anchor a data-link key instead of an href.
 *
 *   <a class="btn" data-link="cv">Download CV</a>
 *   <a class="btn" data-link="email">Email me</a>
 *
 * Valid keys are the properties of `links` in config.js. "email" is special-
 * cased into a mailto: URL.
 *
 * Anything that takes the reader away from the site opens in a new tab: any
 * off-site URL, and any PDF (the CV is served from this repository, so it is a
 * relative path but should still not replace the page).
 */

import { links } from "../config.js";

const opensInNewTab = (url) => /^https?:/i.test(url) || /\.pdf$/i.test(url);

export function initConfigLinks(root = document) {
    root.querySelectorAll("[data-link]").forEach((anchor) => {
        const key = anchor.dataset.link;
        const url = key === "email" ? `mailto:${links.email}` : links[key];

        if (!url) {
            console.warn(`links.js: no config entry named "${key}"`);
            return;
        }

        anchor.setAttribute("href", url);

        if (opensInNewTab(url)) {
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute("rel", "noopener noreferrer");
        }
    });
}
