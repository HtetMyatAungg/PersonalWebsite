/**
 * site.js — the bootstrap every page runs.
 *
 * Importing this module is enough: it wires the header/footer, the theme
 * toggle, scroll reveals, and copy buttons. Pages with no extra behaviour load
 * it directly:
 *
 *   <script type="module" src="assets/js/site.js"></script>
 *
 * Pages with extra behaviour load their own entry module, which imports this
 * one first (see pages/*.js).
 */

import { initLayout } from "./modules/layout.js";
import { initTheme } from "./modules/theme.js";
import { initReveal } from "./modules/reveal.js";
import { initCopyButtons } from "./modules/clipboard.js";
import { initConfigLinks } from "./modules/links.js";

initLayout();
initTheme();
initConfigLinks();
initReveal();
initCopyButtons();
