# Website design guide

Everything you need to change this site yourself, without reading the code
first. Written for future-you, six months from now, at 1am, wanting to add a
blog post.

- [1. What this site is](#1-what-this-site-is)
- [2. File map](#2-file-map)
- [3. Local development](#3-local-development)
- [4. The four CSS layers](#4-the-four-css-layers)
- [5. Design tokens](#5-design-tokens)
- [6. Components](#6-components)
- [7. Page layouts](#7-page-layouts)
- [8. The JavaScript architecture](#8-the-javascript-architecture)
- [9. The blog](#9-the-blog)
- [10. Comments](#10-comments)
- [11. The contact form](#11-the-contact-form)
- [12. Common edits, step by step](#12-common-edits-step-by-step)
- [13. Rules that keep this clean](#13-rules-that-keep-this-clean)
- [14. Accessibility and performance notes](#14-accessibility-and-performance-notes)
- [15. Deployment](#15-deployment)
- [16. Known gaps and things to do next](#16-known-gaps-and-things-to-do-next)

---

## 1. What this site is

A static personal research site. **No framework, no build step, no npm
install.** Every file that exists in the repository is a file the browser
downloads. You edit HTML/CSS/JS, commit, and GitHub Pages serves it at
`htetmyataung.uk`.

The design goals, in priority order:

1. **A recruiter or professor understands your research in fifteen seconds.**
   The home page leads with the research question, not with a skills list.
2. **Claims are checkable.** Numbers are the ones on your CV, and speculative
   items are labelled ("Targeted", "In preparation") rather than implied.
3. **Nothing is written twice.** One header, one footer, one button style, one
   filter engine, one place for every URL.
4. **You can change it in five years.** Which is what this document is for.

### Visual direction

| Aspect | Choice | Why |
| --- | --- | --- |
| Typeface, display | Newsreader (serif) | Academic register; distinguishes you from the sans-only dev-portfolio default. |
| Typeface, body | Inter | Neutral, screen-optimised, wide weight range. |
| Typeface, mono | JetBrains Mono | Metadata, labels, code. Signals "this person writes code" without shouting. |
| Colour | Near-black + violet accent | Carried over from your original site, tightened into a token system. |
| Themes | Dark default, light available | Dark reads as technical; light reads better in daylight and when printed. |
| Motion | Small, one-shot reveals | Enough to feel considered; never blocks reading. Fully disabled under `prefers-reduced-motion`. |

---

## 2. File map

```
/
├── index.html            Home
├── about.html            Biography, education, skills, service
├── research.html         Research + experience (the flagship page)
├── projects.html         Filterable project grid + MyanPay demo video
├── blog.html             Post index with tag filter and search
├── post.html             Renders ANY single post: post.html?p=<slug>
├── contact.html          Form + direct details
├── 404.html              Not-found page
├── experience.html       Redirect stub -> research.html (keeps old links alive)
├── HtetMyatAung-CV.pdf   The CV every "Download CV" link points at
├── CNAME                 Custom domain for GitHub Pages
├── DESIGN.md             This file
│
├── assets/
│   ├── css/
│   │   ├── tokens.css        Layer 1 — names for every value
│   │   ├── base.css          Layer 2 — reset + bare elements + layout primitives
│   │   ├── components.css    Layer 3 — every reusable piece of UI
│   │   └── pages.css         Layer 4 — page-specific composition
│   │
│   ├── js/
│   │   ├── config.js         ALL site data: links, nav, skills, service keys
│   │   ├── site.js           Bootstrap every page runs
│   │   ├── modules/
│   │   │   ├── layout.js     Renders header + footer, mobile nav
│   │   │   ├── theme.js      Light/dark toggle
│   │   │   ├── links.js      Fills hrefs from config (data-link)
│   │   │   ├── reveal.js     Scroll-in animations
│   │   │   ├── clipboard.js  Copy-to-clipboard buttons
│   │   │   ├── filters.js    Tag + search filtering (projects AND blog)
│   │   │   ├── posts.js      Reads content/, formats dates
│   │   │   ├── post-card.js  The one post-summary markup
│   │   │   ├── markdown.js   Markdown -> HTML renderer
│   │   │   └── comments.js   giscus mounting + fallback
│   │   └── pages/
│   │       ├── home.js       Marquee + latest posts
│   │       ├── about.js      Skill groups
│   │       ├── projects.js   Filter bar + demo video
│   │       ├── blog.js       Post list + tag chips
│   │       ├── post.js       Single post, TOC, pager, comments
│   │       └── contact.js    Validation + EmailJS
│   │
│   └── media/            Images and the demo video
│
└── content/
    ├── posts.json        The post manifest (index metadata)
    └── posts/*.md        One Markdown file per post
```

**Rule of thumb for "where does this go?":** data → `config.js`; how something
looks → `components.css`; where something sits → `pages.css`; words a human
reads → the `.html` file or a `.md` post.

---

## 3. Local development

`fetch()` refuses to read files over `file://`, and the blog uses `fetch()` to
load posts. **Opening `index.html` by double-clicking will leave the blog
empty.** Serve the folder over HTTP instead:

```bash
# From the repository root — pick whichever you have
python -m http.server 8000
npx serve .
```

Then open <http://localhost:8000>. Every other page works fine either way; only
the blog needs the server.

---

## 4. The four CSS layers

Stylesheets load in this order, and the order is load-bearing — later layers
depend on earlier ones and are allowed to override them.

| # | File | Contains | Never contains |
| --- | --- | --- | --- |
| 1 | `tokens.css` | Custom properties only. Colours, type scale, spacing, radii, motion, both themes. | Any selector that styles an element. |
| 2 | `base.css` | Reset, bare-element defaults (`h1`, `a`, `ul`), layout primitives (`.container`, `.section`, `.stack`, `.row`), focus rings, reduced-motion. | Anything with a component name. |
| 3 | `components.css` | Every reusable piece: buttons, cards, badges, nav, forms, filter bar, prose, footer. | Positioning of a component within a page. |
| 4 | `pages.css` | Composition: the hero grid, the about sidebar, the post layout, the contact split. | Colours or sizes that are not `var(--token)`. |

Two consequences worth internalising:

- **A component never sets its own outer margin.** The parent decides spacing,
  using `.stack`, `.row`, or a grid `gap`. This is why cards can be dropped
  anywhere without fighting the layout.
- **No raw values below layer 1.** If you find yourself typing `#8b7fff` or
  `24px` in layers 2–4, the right move is to add a token.

---

## 5. Design tokens

All in `assets/css/tokens.css`.

### Type scale

Sizes are fluid — each interpolates between a phone width and a desktop width
with `clamp()`. **There are no font-size media queries anywhere in the
codebase**, and there should not be.

`--text-2xs` · `--text-xs` · `--text-sm` · `--text-base` · `--text-md` ·
`--text-lg` · `--text-xl` · `--text-2xl` · `--text-3xl` · `--text-4xl`

To make everything slightly larger, edit the `clamp()` on `--text-base` and the
steps around it, not individual components.

### Spacing

`--space-1` (4px) through `--space-11` (112px), plus `--section-gap` for the
vertical rhythm between major page sections. Change `--section-gap` alone to
make the whole site denser or airier.

### Colour

Colours are **semantic**, never literal. There is no `--violet-500`; there is
`--accent`. Both themes define exactly the same names, which is why no component
knows or cares which theme is active.

| Token | Role |
| --- | --- |
| `--bg`, `--bg-deep` | Page background |
| `--surface`, `--surface-raised`, `--surface-sunken` | Card and panel backgrounds |
| `--border`, `--border-strong` | Hairlines |
| `--text`, `--text-muted`, `--text-subtle` | Text, in descending emphasis |
| `--accent`, `--accent-hover`, `--accent-quiet`, `--accent-line`, `--accent-glow` | The violet, at five strengths |
| `--on-accent` | Text drawn *on top of* `--accent` |
| `--positive`, `--caution`, `--info`, `--critical` (+ `--*-quiet`) | Status colours |

**To rebrand the whole site,** change `--accent`, `--accent-hover`,
`--accent-quiet`, `--accent-line`, `--accent-glow`, and `--on-accent` in both
theme blocks. Nothing else needs touching.

### How theming works

1. `<html>` carries `data-theme="dark"` or `data-theme="light"`.
2. An **inline script in every page's `<head>`** reads `localStorage["hma-theme"]`,
   falls back to the OS preference, and sets the attribute *before first paint*.
   This is why there is no flash of the wrong theme. It must stay inline and
   blocking — moving it to an external file reintroduces the flash.
3. `theme.js` handles the toggle button and fires a `themechange` event so other
   components (currently just giscus) can follow along.

That inline snippet is the one piece of code deliberately duplicated across
pages. It is nine lines, and the alternative is worse.

---

## 6. Components

Naming is `block__element--modifier`.

| Component | Class | Notes |
| --- | --- | --- |
| Button | `.btn` + `--primary` / `--outline` / `--ghost` / `--sm` / `--block` | Works on `<a>` and `<button>` alike. |
| Text link | `.link` | Underline grows on hover. |
| Header | `.site-header` | Rendered by `layout.js`, not written in HTML. |
| Nav item | `.nav__link` | Active state via `aria-current="page"`. |
| Status pill | `.pill` + `.pill__dot` | The "open to opportunities" chip. |
| Tech chip | `.tag`, in a `.tag-list` | Monospace, low emphasis. |
| Label | `.badge` + `--live` / `--award` / `--progress` / `--quiet` | Categorical, uppercase. |
| Card | `.card` + `--interactive` / `--featured` | Parts: `__head`, `__title`, `__meta`, `__result`, `__body`, `__actions`. |
| Card grid | `.card-grid` + `--wide` / `--compact` | Column count is content-driven; no media query. |
| CTA panel | `.cta` + `.cta__body` | The closing block on most pages. |
| Metric strip | `.metrics` > `.metric` | Big number + caption. |
| Timeline | `.timeline` > `.entry` (+ `--current`) | `--current` gives a filled, glowing node. |
| Filter bar | `.filter-bar`, `.filter-chip`, `.search-field` | Behaviour lives in `filters.js`. |
| Form | `.form`, `.field`, `.field__control`, `.field__error`, `.form-status` | |
| Marquee | `.marquee` > two `.marquee__track` | Two identical tracks make the loop seamless. |
| Post summary | `.post-card` | Generated by `post-card.js`; never hand-written. |
| Long-form text | `.prose` | The **only** place Markdown output is styled. |
| Table of contents | `.toc` | |
| Prev/next | `.pager` | |
| Footer | `.site-footer` | Rendered by `layout.js` from `footerColumns`. |
| Section heading | `.eyebrow` + `.section-head` | The small mono label with a trailing rule. |
| Body paragraph | `.lede` | Constrained measure, muted colour. |

### Scroll reveal

Add `class="reveal"` to anything that should fade up on entry. Add
`data-reveal-delay="80"` (milliseconds) to stagger siblings. Under
`prefers-reduced-motion: reduce`, or with JavaScript disabled, revealed elements
are simply visible from the start — content is never hidden behind an
animation that might not run.

---

## 7. Page layouts

In `pages.css`:

| Class | Page | Shape |
| --- | --- | --- |
| `.hero` / `.hero--compact` | all | Two columns (text + portrait) on home; one column elsewhere. |
| `.question` | home, research | Prose on the left, `.findings` list on the right. |
| `.about-layout` | about | Sticky 17rem sidebar + biography column. |
| `.feature` | projects | Text beside the demo video. |
| `.post-layout` | post | Prose column + sticky TOC, TOC dropped below 64rem. |
| `.contact-layout` | contact | Form + details. |
| `.notfound` | 404 | Centred. |

**Breakpoints** (only five in the whole site, all `max-width`): `40rem`,
`52rem`, `56rem`, `60rem`, `64rem`. Everything else adapts through `clamp()`,
`auto-fill`, and `minmax()`.

---

## 8. The JavaScript architecture

Plain ES modules loaded with `<script type="module">`. No bundler, no
transpiler.

```
page.html
  └── assets/js/pages/<page>.js      one entry per page
        ├── imports ../site.js       chrome, theme, links, reveals, copy buttons
        └── page-specific work
```

Pages with no extra behaviour (`research.html`, `404.html`) load
`assets/js/site.js` directly.

### The rules this follows

1. **`config.js` is the only place data lives.** No module hard-codes a URL, an
   email address, or a nav label.
2. **One job per module.** `posts.js` reads data; `post-card.js` builds markup;
   `filters.js` filters; none of them know about each other's internals.
3. **Markup contracts are `data-` attributes.** JavaScript never selects by CSS
   class, so restyling can never break behaviour. If you rename `.post-card`,
   nothing stops working.
4. **Failures degrade, never crash.** A missing manifest shows a message; a
   video that will not load swaps in a link; an unconfigured comment system
   shows a fallback panel.

### The `data-link` mechanism

Instead of pasting a URL into an `<a href>`, write the config key:

```html
<a class="btn btn--primary" data-link="cv">Download CV</a>
<a class="link" data-link="github">GitHub</a>
<a class="link" data-link="email">Email me</a>
```

`links.js` fills in the `href` and adds `target="_blank" rel="noopener
noreferrer"` to anything that takes the reader off the page — any off-site URL,
and any `.pdf` (the CV is a relative path but should still not replace the
page). Valid keys are the properties of `links` in `config.js`, plus the
special key `email` (wrapped into a `mailto:`).

**Trade-off, stated plainly:** these links, the header, and the footer are all
JavaScript-rendered, so they do not exist with JS disabled. That was accepted
deliberately — it is what buys single-source-of-truth chrome across eight pages
— and search engines execute JavaScript, so it does not cost you indexing. The
page *content* is all in the HTML.

---

## 9. The blog

### Content model

```
content/posts.json         array of metadata, one object per post
content/posts/<slug>.md    the body of that post
```

`blog.html` reads only the manifest, so listing all posts costs one request.
`post.html?p=<slug>` reads the manifest plus that one `.md` file.

### Adding a post

1. Create `content/posts/my-new-post.md`. Write the body **without** a title
   heading — the title comes from the manifest and is rendered as the `<h1>`.
   Start section headings at `##`.
2. Add an entry to the **top** of `content/posts.json`:

```json
{
    "slug": "my-new-post",
    "title": "The title, in sentence case",
    "date": "2026-09-01",
    "minutes": 4,
    "summary": "One or two sentences. This is what shows on the index and in link previews.",
    "tags": ["Interpretability", "Evaluation"]
}
```

3. That is the whole process. The tag chips, the search index, the home-page
   "Research notes" block, and the prev/next pager all update themselves.

Field notes:

- `slug` **must** match the filename without `.md`.
- `date` is ISO `YYYY-MM-DD`; posts sort newest-first automatically.
- `minutes` is shown on the index. If you omit it, the post page computes the
  real figure from the body at 220 words per minute.
- `tags` are display strings. They are lower-cased and hyphenated for the URL,
  so `"Interpretability"` becomes `?tag=interpretability`.
- Add `"draft": true` to keep a post in the repository but off the site.

### Filtering

Both the blog index and the projects grid use the same engine, `filters.js`.
It hides non-matching items with `[data-filter-hidden]`, updates the chip
counts and the result count, shows the empty state when nothing matches, and
mirrors the active tag into the URL as `?tag=…` so a filtered view can be
shared and survives a refresh.

### Markdown support

`markdown.js` is a deliberately small renderer, not a CommonMark
implementation. It supports:

headings `##`–`#####` · paragraphs · `**bold**` · `*italic*` · `` `code` `` ·
fenced code blocks with a language hint · links · images · bullet lists ·
numbered lists · blockquotes · `---` rules · pipe tables

Not supported (by choice): raw HTML, nested lists, footnotes, LaTeX maths.

**Security:** the source is HTML-escaped before any inline rule runs, so post
text cannot inject markup, and link targets are checked against an allow-list
of schemes (`http`, `https`, `mailto`, anchors, relative paths). A
`javascript:` URL is rewritten to `#`.

**If you want LaTeX** (likely, eventually): add KaTeX's CSS and JS to
`post.html` and call `renderMathInElement` on `[data-post-body]` at the end of
`post.js`. That is the whole change; nothing else needs to move.

---

## 10. Comments

Comments are **GitHub Discussions**, surfaced through
[giscus](https://giscus.app). No server, no database, no spam queue — readers
sign in with GitHub, you moderate from the repository, and every thread is
portable data you own.

### Turning them on (four steps, about five minutes)

1. In `HtetMyatAungg/PersonalWebsite` → **Settings → General → Features**, tick
   **Discussions**.
2. In **Discussions → Categories**, create a category called
   **`Blog comments`**. Choose the **Announcement** format so only you can open
   new threads — giscus creates them on demand.
3. Install the [giscus GitHub App](https://github.com/apps/giscus) and grant it
   access to this repository.
4. Go to <https://giscus.app>, enter the repository, and it prints a
   `data-repo-id` and a `data-category-id`. Paste both into
   `assets/js/config.js`:

```js
export const comments = {
    repo: "HtetMyatAungg/PersonalWebsite",
    repoId: "R_kgDO...",          // <- from giscus.app
    category: "Blog comments",
    categoryId: "DIC_kwDO...",    // <- from giscus.app
    mapping: "pathname",
    lang: "en",
};
```

Until those two IDs are filled in, every post shows a tidy fallback panel
pointing at Discussions and your email, rather than a broken widget. That is
intentional — the site is presentable in either state.

The widget follows your light/dark toggle: `comments.js` listens for the
`themechange` event and posts a `setConfig` message into the giscus iframe.

---

## 11. The contact form

`contact.js` validates on the client, then sends through **EmailJS**, which is
how a static page sends mail without a backend. The public key, service ID, and
template ID are in `config.js` under `emailService`. The public key is designed
to be public; the other two are not secrets either.

The template expects these variables: `from_name`, `from_email`, `subject`,
`message`.

If a send fails, the form shows your email address as a fallback rather than
swallowing the error.

**Your phone number is deliberately not on the site.** It is on your CV, which
is a document you hand to specific people; a website publishes it to scrapers.
If you want it anyway, add a `.detail` block to `contact.html` alongside the
others.

---

## 12. Common edits, step by step

**Change a link (GitHub, LinkedIn, email)**
→ `assets/js/config.js`, the `links` object. One line, updates everywhere.

**Publish a new CV**
→ Overwrite `HtetMyatAung-CV.pdf` in the repository root and commit. Keep the
filename: it is what lands in the recruiter's downloads folder, and it is the
one string `links.cv` points at. Nothing in the code needs to change.

**Add a nav item**
→ `assets/js/config.js`, the `nav` array. Then create the page and set
`<body data-page="yourfile">` so the item highlights.

**Add a project**
→ Copy an `<article class="card">` in `projects.html`. Set `data-tags` to one or
more of `research ml applied infra`, and put searchable keywords that are not in
the visible text into `data-search`. Chip counts update automatically.

**Add a project filter category**
→ Add a `<button class="filter-chip" data-filter="newtag">` to the chip row, and
use `newtag` in the `data-tags` of the relevant cards.

**Change the accent colour**
→ `tokens.css`, the six `--accent*` / `--on-accent` values, in *both* theme
blocks.

**Change a skill list**
→ `assets/js/config.js`, `skillGroups`. Feeds both the home marquee and the
about page table.

**Update a metric on the home page**
→ `index.html`, the `.metrics` block. Keep the numbers matching your CV.

**Make the site denser or airier**
→ `tokens.css`, `--section-gap`.

**Change the footer**
→ `assets/js/config.js`, `footerColumns`.

---

## 13. Rules that keep this clean

If you only remember five things:

1. **Data goes in `config.js`.** If you are typing a URL into HTML, stop.
2. **No inline `style=` attributes.** If you need a one-off, it is a component
   modifier or a token.
3. **No raw colours or sizes outside `tokens.css`.**
4. **JavaScript selects `data-` attributes, CSS selects classes.** Never mix
   them, and neither can break the other.
5. **Components do not set their own outer margins.** The parent owns spacing.

---

## 14. Accessibility and performance notes

Built in, and worth not regressing:

- Semantic landmarks (`header`, `nav`, `main`, `article`, `aside`, `footer`) and
  a skip link on every page.
- One visible focus style, applied globally through `:focus-visible`. Never
  remove it.
- The mobile menu manages `aria-expanded` and `aria-controls`, closes on
  `Escape`, on outside click, and on navigation, and returns focus to its
  button.
- Filter chips are real buttons with `aria-pressed`. Form errors use
  `role="alert"` and `aria-invalid`.
- All motion is off under `prefers-reduced-motion: reduce`, including the
  marquee, which becomes a normal scrollable strip.
- Both themes are checked for text contrast; `--text-subtle` is the lowest and
  is only ever used for non-essential metadata.
- No horizontal scroll at any width from 320px up. There is a specific trap
  here: any decorative element bled sideways past the viewport (an absolutely
  positioned wash with negative left/right inset, say) widens the document and
  gives *every* page a scrollbar. The hero wash is deliberately flush with the
  hero's edges for this reason.
- Zero runtime dependencies. The only third-party requests are Google Fonts,
  EmailJS on the contact page, and giscus on post pages.

### The one heavy asset

`assets/media/myanpay-demo.mp4` is about 40 MB and lives in the repository. It
is `preload="metadata"`, so visitors do not download it unless they press play,
but it does make clones slow. If it ever becomes annoying, upload it to YouTube
unlisted and swap the `<video>` in `projects.html` for an iframe.

---

## 15. Deployment

GitHub Pages serves the `main` branch of `HtetMyatAungg/PersonalWebsite`.
`CNAME` points it at `htetmyataung.uk`. Push to `main` and it is live in about a
minute. There is nothing to build.

Before pushing, worth a quick pass:

- Serve locally and click through all six pages.
- Open one blog post and check the TOC, the pager, and the comment panel.
- Toggle light/dark on at least one page.
- Narrow the window to phone width and open the menu.

---

## 16. Known gaps and things to do next

Honest list, roughly in order of value:

1. **The five starter blog posts are drafts written from your CV.** They are
   accurate to what your CV states and contain no invented results, but they are
   in a voice someone else chose. Read them and rewrite anything that does not
   sound like you before you send this link to anyone.
2. **Comments are not switched on yet** — see §10. Four steps.
3. **There is no RSS feed.** Researchers do still use them. It would be a small
   script that turns `posts.json` into `feed.xml`.
4. **`post.html?p=slug` is not the prettiest URL,** and link previews for
   individual posts fall back to the generic description because the meta tags
   are set by JavaScript. Real per-post URLs and previews would need either one
   HTML file per post or a small generator script.
5. **No sitemap.xml or robots.txt.** Both are two-minute additions and help
   indexing.
6. **The CV is now committed to the repository** as `HtetMyatAung-CV.pdf`,
   replacing the two inconsistent Google Drive links the old site used. It
   serves from `htetmyataung.uk/HtetMyatAung-CV.pdf`, so remember it is a
   *public* file — anything you would not want indexed should not be in it.
   Re-export it whenever your CV changes, or the site will quietly hand out a
   stale one.
