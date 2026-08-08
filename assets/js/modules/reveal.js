/**
 * reveal.js — fades elements in as they scroll into view.
 *
 * Usage: add class="reveal" in the markup. Optional data-reveal-delay="120"
 * (milliseconds) staggers an element within a group.
 *
 * Elements are revealed once and then unobserved. If IntersectionObserver is
 * unavailable, everything is shown immediately.
 */

export function initReveal(root = document) {
    const targets = root.querySelectorAll(".reveal:not(.is-visible)");
    if (!targets.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !("IntersectionObserver" in window)) {
        targets.forEach((el) => el.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const delay = Number(entry.target.dataset.revealDelay || 0);
                entry.target.style.transitionDelay = `${delay}ms`;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    targets.forEach((el) => observer.observe(el));
}
