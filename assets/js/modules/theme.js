/**
 * theme.js — light/dark switching.
 *
 * The theme is applied *before first paint* by the inline bootstrap snippet in
 * each page's <head>, so there is never a flash of the wrong theme. This module
 * only handles the toggle button and broadcasting changes.
 */

const STORAGE_KEY = "hma-theme";

/** Anyone who needs to react to a theme change listens for this event. */
export const THEME_CHANGE_EVENT = "themechange";

function currentTheme() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        /* Private browsing: the theme simply will not persist. */
    }
    document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
}

/** Wire up every [data-theme-toggle] button on the page. */
export function initTheme() {
    const toggles = document.querySelectorAll("[data-theme-toggle]");

    const sync = () => {
        const next = currentTheme() === "light" ? "dark" : "light";
        toggles.forEach((btn) => {
            btn.setAttribute("aria-label", `Switch to ${next} theme`);
            btn.setAttribute("title", `Switch to ${next} theme`);
        });
    };

    toggles.forEach((btn) => {
        btn.addEventListener("click", () => {
            applyTheme(currentTheme() === "light" ? "dark" : "light");
            sync();
        });
    });

    sync();
}

export { currentTheme };
