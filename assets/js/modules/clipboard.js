/**
 * clipboard.js — copy-to-clipboard for any [data-copy] button.
 *
 * Markup contract:
 *   <button class="btn copy-btn" data-copy="text to copy">
 *       <span class="copy-btn__idle">Copy</span>
 *       <span class="copy-btn__done">Copied</span>
 *   </button>
 *
 * The confirmation state is CSS-only, driven by data-copied on the button.
 */

const RESET_DELAY = 1800;

export function initCopyButtons(root = document) {
    root.querySelectorAll("[data-copy]").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copy);
                button.dataset.copied = "true";
                setTimeout(() => delete button.dataset.copied, RESET_DELAY);
            } catch {
                /* Clipboard blocked (insecure context or denied permission).
                   The adjacent mailto link remains the reliable path. */
            }
        });
    });
}
