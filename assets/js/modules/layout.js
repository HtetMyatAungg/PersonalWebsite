/**
 * layout.js — renders the site header and footer from config.
 *
 * The chrome exists in exactly one place. Every page ships two empty mount
 * elements and this module fills them:
 *
 *   <header class="site-header" data-site-header></header>
 *   <footer class="site-footer" data-site-footer></footer>
 *
 * The mounts carry their classes in the markup so the sticky header reserves
 * its height during parse — nothing shifts when the JS runs.
 *
 * The active nav item comes from <body data-page="...">, which matches the
 * basename of the nav href (e.g. data-page="blog" for blog.html). post.html
 * also uses "blog" so a post keeps Writing highlighted.
 *
 * Home has no nav item — the brand is the way home, as it is on most sites — so
 * on index.html the brand itself carries aria-current instead.
 *
 * The brand links to "/" rather than "index.html": both serve the same file, but
 * only "/" leaves a clean htetmyataung.uk in the address bar. This is the one
 * link that drops its filename — every other internal link keeps the .html, so
 * that VS Code Live Server can serve the site as well as `npm run dev` can.
 */

import { site, links, nav, footerColumns } from "../config.js";

const icon = {
    moon: `<svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`,
    sun: `<svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>`,
    menu: `<svg class="nav-toggle__open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
    close: `<svg class="nav-toggle__close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
};

/**
 * A nav href -> the <body data-page> key it should highlight.
 *   "/writing/" -> "writing"      "/" -> "index"
 * The .html strip is kept so a legacy "blog.html" href still matches, which is
 * what let the pages move into folders one at a time without the underline
 * blinking out halfway through.
 */
function keyOf(href) {
    return href.replace(/\.html$/, "").replace(/^\/+|\/+$/g, "") || "index";
}

function navMarkup(activePage) {
    return nav
        .map((item) => {
            const current = keyOf(item.href) === activePage ? ' aria-current="page"' : "";
            return `<a class="nav__link" href="${item.href}"${current}>${item.label}</a>`;
        })
        .join("");
}

function headerMarkup(activePage) {
    const atHome = activePage === "index" ? ' aria-current="page"' : "";

    return `
    <div class="container site-header__inner">
        <a class="brand" href="/"${atHome}>
            <img class="brand__avatar" src="/assets/media/avatar.jpg" alt="" width="34" height="34">
            <span class="brand__text">
                <span class="brand__name">${site.name}</span>
                <span class="brand__role">${site.role}</span>
            </span>
        </a>
        <nav class="site-nav" id="primary-nav" aria-label="Primary">${navMarkup(activePage)}</nav>
        <div class="header__actions">
            <button class="icon-btn" type="button" data-theme-toggle>${icon.moon}${icon.sun}</button>
            <a class="btn btn--primary btn--sm" href="${links.cv}" target="_blank" rel="noopener noreferrer">CV</a>
            <button class="icon-btn nav-toggle" type="button" data-nav-toggle
                    aria-controls="primary-nav" aria-expanded="false" aria-label="Open menu">${icon.menu}${icon.close}</button>
        </div>
    </div>`;
}

function footerMarkup() {
    const columns = footerColumns
        .map(
            (col) => `
        <div class="footer-col">
            <h2 class="footer-col__title">${col.title}</h2>
            <div class="footer-col__links">
                ${col.links
                    .map((l) => {
                        const attrs = l.newTab
                            ? ' target="_blank" rel="noopener noreferrer"'
                            : "";
                        return `<a href="${l.href}"${attrs}>${l.label}</a>`;
                    })
                    .join("")}
            </div>
        </div>`
        )
        .join("");

    return `
    <div class="container">
        <div class="site-footer__grid">
            <div class="footer-col">
                <h2 class="footer-col__title">${site.shortName}</h2>
                <p class="footer-col__blurb">${site.tagline}<br>${site.location}</p>
            </div>
            ${columns}
        </div>
        <div class="site-footer__note">
            <span>&copy; ${new Date().getFullYear()} ${site.name}</span>
            <span>Hand-built &middot; no framework &middot; <a class="link" href="${links.repo}" target="_blank" rel="noopener noreferrer">source</a></span>
        </div>
    </div>`;
}

/** Opens/closes the mobile nav panel and keeps ARIA state in sync. */
function initNavToggle() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const panel = document.getElementById("primary-nav");
    if (!toggle || !panel) return;

    /* Both icons are always in the DOM and CSS picks one off aria-expanded.
       Swapping innerHTML here would detach the very node the click came from,
       and the outside-click handler below would then read it as a click
       outside the header and immediately close the panel again. */
    const setOpen = (open) => {
        panel.dataset.open = String(open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    setOpen(false);

    toggle.addEventListener("click", () => setOpen(panel.dataset.open !== "true"));

    panel.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && panel.dataset.open === "true") {
            setOpen(false);
            toggle.focus();
        }
    });

    document.addEventListener("click", (event) => {
        if (panel.dataset.open !== "true") return;
        if (!event.target.closest(".site-header")) setOpen(false);
    });
}

/** Fill the header/footer mounts. Called once, by site.js. */
export function initLayout() {
    const activePage = document.body.dataset.page || "index";

    const header = document.querySelector("[data-site-header]");
    if (header) header.innerHTML = headerMarkup(activePage);

    const footer = document.querySelector("[data-site-footer]");
    if (footer) footer.innerHTML = footerMarkup();

    initNavToggle();
}
