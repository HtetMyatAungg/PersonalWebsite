/**
 * markdown.js — a small, dependency-free Markdown renderer.
 *
 * Deliberately covers only what blog posts here actually use:
 *   headings (## to #####), paragraphs, bold, italic, inline code,
 *   fenced code blocks, links, images, unordered + ordered lists,
 *   blockquotes, horizontal rules, and pipe tables.
 *
 * Safety: the source is HTML-escaped *before* any inline rule runs, so post
 * text can never inject markup, and link targets are checked against an
 * allow-list of schemes.
 *
 * Output is styled entirely by the .prose rules in components.css.
 */

/* Page-relative URLs are deliberately NOT allowed. A post is rendered at
   /writing/<slug>/, so "assets/media/x.png" in post source would resolve
   against that folder rather than the site root and silently 404 — and the same
   post text would mean different things if it were ever rendered elsewhere.
   Post links must be absolute, root-absolute, a mailto:, or a #fragment;
   anything else becomes "#" via safeUrl(). */
const ALLOWED_SCHEME = /^(https?:|mailto:|#|\/)/i;
/* A NUL byte cannot appear in post source, which makes it a safe stand-in for
   parked code spans. */
const CODE_PLACEHOLDER = String.fromCharCode(0);

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Blocks anything that is not a plain navigational URL. */
function safeUrl(url) {
    return ALLOWED_SCHEME.test(url.trim()) ? url.trim() : "#";
}

export function slugify(text) {
    return text
        .toLowerCase()
        /* Drop markup and apostrophes outright so "What's" becomes "whats"
           rather than "what-s". Everything else collapses to a hyphen. */
        .replace(/['‘’`*_[\]()]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Inline-level formatting for one already-block-scoped string. */
function inline(raw) {
    let text = escapeHtml(raw);

    /* Park code spans so their contents are not treated as emphasis. */
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, code) => {
        codes.push(code);
        return `${CODE_PLACEHOLDER}${codes.length - 1}${CODE_PLACEHOLDER}`;
    });

    text = text
        .replace(
            /!\[([^\]]*)\]\(([^)\s]+)\)/g,
            (_, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy">`
        )
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
            const url = safeUrl(href);
            const external = /^https?:/i.test(url);
            const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
            return `<a href="${url}"${attrs}>${label}</a>`;
        })
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");

    return text.replace(
        new RegExp(`${CODE_PLACEHOLDER}(\\d+)${CODE_PLACEHOLDER}`, "g"),
        (_, index) => `<code>${codes[Number(index)]}</code>`
    );
}

const RE = {
    fence: /^```\s*([\w-]*)\s*$/,
    heading: /^(#{1,5})\s+(.*)$/,
    rule: /^(-{3,}|\*{3,}|_{3,})\s*$/,
    quote: /^>\s?(.*)$/,
    bullet: /^[-*+]\s+(.*)$/,
    ordered: /^\d+[.)]\s+(.*)$/,
    tableRow: /^\|(.+)\|\s*$/,
    tableDivider: /^\|[\s:|-]+\|\s*$/,
};

function isBlockStart(line) {
    return (
        !line.trim() ||
        RE.fence.test(line) ||
        RE.heading.test(line) ||
        RE.rule.test(line) ||
        RE.quote.test(line) ||
        RE.bullet.test(line) ||
        RE.ordered.test(line) ||
        RE.tableRow.test(line)
    );
}

function cells(row) {
    return row
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => inline(cell.trim()));
}

/** Renders Markdown to an HTML string. */
export function renderMarkdown(source) {
    const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
            i += 1;
            continue;
        }

        /* Fenced code — taken verbatim, no inline processing. */
        const fence = line.match(RE.fence);
        if (fence) {
            const body = [];
            i += 1;
            while (i < lines.length && !RE.fence.test(lines[i])) {
                body.push(lines[i]);
                i += 1;
            }
            i += 1; // closing fence
            const lang = fence[1] ? ` class="language-${fence[1]}"` : "";
            html.push(`<pre><code${lang}>${escapeHtml(body.join("\n"))}</code></pre>`);
            continue;
        }

        const heading = line.match(RE.heading);
        if (heading) {
            const level = heading[1].length;
            const text = heading[2].trim();
            html.push(`<h${level} id="${slugify(text)}">${inline(text)}</h${level}>`);
            i += 1;
            continue;
        }

        if (RE.rule.test(line)) {
            html.push("<hr>");
            i += 1;
            continue;
        }

        if (RE.quote.test(line)) {
            const body = [];
            while (i < lines.length && RE.quote.test(lines[i])) {
                body.push(lines[i].match(RE.quote)[1]);
                i += 1;
            }
            html.push(`<blockquote>${inline(body.join(" "))}</blockquote>`);
            continue;
        }

        /* Tables need a divider row directly under the header row. */
        if (RE.tableRow.test(line) && RE.tableDivider.test(lines[i + 1] || "")) {
            const head = cells(line);
            i += 2;
            const body = [];
            while (i < lines.length && RE.tableRow.test(lines[i])) {
                body.push(cells(lines[i]));
                i += 1;
            }
            html.push(
                `<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead>` +
                    `<tbody>${body
                        .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
                        .join("")}</tbody></table>`
            );
            continue;
        }

        const listPattern = RE.bullet.test(line)
            ? RE.bullet
            : RE.ordered.test(line)
              ? RE.ordered
              : null;

        if (listPattern) {
            const tag = listPattern === RE.bullet ? "ul" : "ol";
            const entries = [];
            while (i < lines.length && listPattern.test(lines[i])) {
                const parts = [lines[i].match(listPattern)[1]];
                i += 1;
                /* Indented continuation lines belong to the same item. */
                while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
                    parts.push(lines[i].trim());
                    i += 1;
                }
                entries.push(inline(parts.join(" ")));
            }
            html.push(`<${tag}>${entries.map((e) => `<li>${e}</li>`).join("")}</${tag}>`);
            continue;
        }

        /* Paragraph: everything up to the next blank line or block start. */
        const paragraph = [line];
        i += 1;
        while (i < lines.length && !isBlockStart(lines[i])) {
            paragraph.push(lines[i]);
            i += 1;
        }
        html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    }

    return html.join("\n");
}

/** Strips fenced blocks so headings inside code are not mistaken for real ones. */
function withoutCodeFences(source) {
    return String(source).replace(/```[\s\S]*?```/g, "");
}

/** Heading list for the table of contents: [{ level, text, id }]. */
export function extractHeadings(source, levels = [2, 3]) {
    return withoutCodeFences(source)
        .split("\n")
        .map((line) => line.match(RE.heading))
        .filter(Boolean)
        .map((match) => ({
            level: match[1].length,
            text: match[2].trim(),
            id: slugify(match[2].trim()),
        }))
        .filter((heading) => levels.includes(heading.level));
}

/** Rounded reading time in minutes, at 220 words per minute. */
export function readingMinutes(source) {
    const words = withoutCodeFences(source).trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
}
