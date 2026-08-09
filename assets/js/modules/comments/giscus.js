/**
 * comments/giscus.js — reader comments backed by GitHub Discussions.
 *
 * Each post gets one discussion thread, keyed by the post's slug. Readers sign
 * in with GitHub to reply; you moderate from the repository. Nothing is stored
 * here, so the site stays fully static.
 *
 * Requires comments.repoId and comments.categoryId in config.js. Run
 * `npm run check:comments` to see what is still missing.
 */

import { comments as config, links } from "../../config.js";
import { THEME_CHANGE_EVENT, currentTheme } from "../theme.js";

const GISCUS_ORIGIN = "https://giscus.app";

/** giscus ships themes whose names match ours, so this is a direct mapping. */
function giscusTheme() {
    return currentTheme() === "light" ? "light" : "dark";
}

/** Keep the embedded widget in step with the site's theme toggle. */
function followThemeChanges() {
    document.addEventListener(THEME_CHANGE_EVENT, () => {
        const frame = document.querySelector("iframe.giscus-frame");
        frame?.contentWindow?.postMessage(
            { giscus: { setConfig: { theme: giscusTheme() } } },
            GISCUS_ORIGIN
        );
    });
}

export function mountGiscus(mount, post) {
    const missing = ["repo", "repoId", "category", "categoryId"].filter((key) => !config[key]);

    if (missing.length) {
        return {
            ok: false,
            headline: "Comments are not switched on yet.",
            detail: `They run on GitHub Discussions. Still needed in assets/js/config.js: ${missing.join(", ")}. See DESIGN.md → Comments.`,
            action: { label: "Open GitHub Discussions", href: `${links.repo}/discussions` },
        };
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
        /* The thread key when mapping is "specific" (which it is — see config).
           The slug, not the title: a title can be reworded after publication and
           that must not orphan the thread. */
        "data-term": post?.slug || "",
        "data-strict": "1",
        "data-reactions-enabled": "1",
        "data-emit-metadata": "0",
        "data-input-position": "top",
        "data-theme": giscusTheme(),
        "data-lang": config.lang,
        "data-loading": "lazy",
    }).forEach(([key, value]) => script.setAttribute(key, value));

    mount.replaceChildren(script);
    followThemeChanges();

    return { ok: true };
}
