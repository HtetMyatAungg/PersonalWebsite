/**
 * projects.js — entry module for projects.html.
 * The project cards are authored directly in the markup (they are hand-written
 * prose, not data), so this only wires the filter bar and the demo video.
 */

import "../site.js";
import { initFilterBar } from "../modules/filters.js";

initFilterBar(document.querySelector("[data-filter-root]") || document);

/* The demo video is a large file. If it cannot play, swap in a link instead of
   leaving an empty black box. */
const video = document.querySelector("[data-demo-video]");

if (video) {
    video.playbackRate = 1.5;
    video.addEventListener("error", () => {
        const fallback = document.querySelector("[data-demo-fallback]");
        if (!fallback) return;
        video.hidden = true;
        fallback.hidden = false;
    });
}
