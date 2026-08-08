/**
 * filters.js — one filtering engine, used by both the projects grid and the
 * blog index. Neither page has any filtering logic of its own.
 *
 * Expected markup inside the root element:
 *
 *   <button class="filter-chip" data-filter="all" aria-pressed="true">All</button>
 *   <input data-filter-search>                       (optional)
 *   <span data-filter-count></span>                  (optional)
 *   <div data-filter-list>
 *     <article data-tags="research interpretability" data-search="extra words">
 *   </div>
 *   <p data-filter-empty hidden>Nothing matched.</p>  (optional)
 *
 * Items keep their place in the DOM; non-matches get [data-filter-hidden],
 * which components.css hides. The active tag is mirrored into the URL as
 * ?tag=… so a filtered view can be linked to and survives a refresh.
 */

const ALL = "all";

function tagsOf(item) {
    return (item.dataset.tags || "").toLowerCase().split(/\s+/).filter(Boolean);
}

function haystackOf(item) {
    return `${item.dataset.search || ""} ${item.textContent}`.toLowerCase();
}

export function initFilterBar(root = document) {
    const list = root.querySelector("[data-filter-list]");
    if (!list) return;

    const items = Array.from(list.querySelectorAll("[data-tags]"));
    const chips = Array.from(root.querySelectorAll("[data-filter]"));
    const search = root.querySelector("[data-filter-search]");
    const empty = root.querySelector("[data-filter-empty]");
    const counter = root.querySelector("[data-filter-count]");

    let activeTag = new URLSearchParams(location.search).get("tag") || ALL;
    if (!chips.some((c) => c.dataset.filter === activeTag)) activeTag = ALL;

    /* Show how many items each chip would match. */
    chips.forEach((chip) => {
        const slot = chip.querySelector(".filter-chip__count");
        if (!slot) return;
        const tag = chip.dataset.filter;
        slot.textContent =
            tag === ALL ? items.length : items.filter((i) => tagsOf(i).includes(tag)).length;
    });

    function apply() {
        const query = (search?.value || "").trim().toLowerCase();
        let shown = 0;

        items.forEach((item) => {
            const tagOk = activeTag === ALL || tagsOf(item).includes(activeTag);
            const textOk = !query || haystackOf(item).includes(query);
            const visible = tagOk && textOk;

            item.toggleAttribute("data-filter-hidden", !visible);
            if (visible) shown += 1;
        });

        chips.forEach((chip) =>
            chip.setAttribute("aria-pressed", String(chip.dataset.filter === activeTag))
        );

        if (empty) empty.hidden = shown > 0;
        if (counter) counter.textContent = `${shown} of ${items.length}`;
    }

    function syncUrl() {
        const url = new URL(location.href);
        if (activeTag === ALL) url.searchParams.delete("tag");
        else url.searchParams.set("tag", activeTag);
        history.replaceState(null, "", url);
    }

    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            activeTag = chip.dataset.filter;
            syncUrl();
            apply();
        });
    });

    search?.addEventListener("input", apply);

    apply();
}
