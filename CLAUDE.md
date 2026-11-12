# CLAUDE.md — design of this codebase

Personal site for Htet Myat Aung, served by GitHub Pages at **htetmyataung.uk**.
Hand-written static HTML/CSS/JS: **no framework, no build step, no
dependencies, no package.json.** Edit, commit, push to `main`, live in about a
minute.

**The site has one job: make a visitor want to hire Htet.** Every decision
below serves that.

## Standing decisions — do not undo without being asked

- **One page, two destinations: "Me" and "Talk to me".** Nothing else in the
  nav. No blog, no separate research or projects pages, no contact form. New
  content goes into the "Me" section.
- **White, black and one accent: highlighter yellow.** No purple, no blue, no
  teal, no decorative gradients, no dark theme, no theme toggle. The owner
  called those "AI colours" and banned them.
- **Short sentences only.** No paragraph on the page is longer than about
  three short sentences. Numbers beat adjectives.
- **The CV is the source of truth.** Every number and title on the page comes
  from `HtetMyatAung-CV.pdf`. Never add a claim that is not on the CV.
- **The page is dynamic.** Motion is part of the brief (see *Motion*). All of
  it must switch off under `prefers-reduced-motion`.
- **No tooling.** The header is plain HTML in both HTML files. `finetune/`
  holds a training-data script; the site never runs it.

## File map

```
index.html            The whole site: Me (hero, proof, work, projects, background,
                      toolkit), Talk to me (chat), footer ("Hire me.")
404.html              Not-found page AND the legacy-URL redirect table
assets/css/site.css   The only stylesheet
assets/js/site.js     The only script (motion, copy, demo dialog, the chat model)
assets/media/         avatar.jpg (header), portrait.png (hero, og:image),
                      icon.png (favicon), myanpay-demo.mp4 (39 MB, demo dialog)
HtetMyatAung-CV.pdf   The CV. Overwrite it, keep the filename.
finetune/             Training data for the "Talk to me" model (see below)
CNAME, .nojekyll      Custom domain; stops Pages running Jekyll. Keep both.
```

## URLs and paths

- Every internal `href`/`src` is **root-absolute** (`/assets/css/site.css`),
  because `404.html` is served at any depth. Do not add `<base href>`.
- Anchors other things rely on: `#me`, `#talk`, `#work`, `#projects`, `#hire`.
- **Legacy redirects:** GitHub Pages serves `404.html` for any missing path.
  An inline script in its `<head>` forwards old URLs through the `moved`
  table (`/research/` → `/#work`, `/projects/` → `/#projects`, `/about.html`
  → `/`, `/contact.html` → `/#hire`, the old blog → `/`). Old CVs carry those
  links. **When a URL changes, add a line to `moved`.** Local servers do not
  serve `404.html`, so this only works once deployed.
- If the site moves off the apex domain, every root-absolute path breaks.

## Page structure (`index.html`)

1. **Header** (sticky): avatar + name → `#me`; nav `Me` / `Talk to me`; black
   **Hire me** button (mailto). A thin progress line tracks scroll. `site.js`
   moves `aria-current` between the two nav links.
2. **Hero:** availability pill → name → "ML engineer who *ships. / measures. /
   leads.*" (rolling word) → one line of context → **Hire me**, Talk to me, CV.
   Portrait on a yellow offset block, with a spinning "HIRE ME · SUMMER 2027"
   stamp that is itself a mailto link.
3. **Proof strip:** four numbers that count up (`100%`, `40h → 30s`, `Top 5`, `18+`).
4. **Ticker:** decorative skills marquee (`aria-hidden`).
5. **01 Work:** four `.job` rows. Source order is role, org, dates, points.
6. **02 Projects:** five `.project` cards, each linked to its repo. MyanPay's
   "Watch demo" opens a `<dialog>` with the video.
7. **03 Background:** Education | Leadership (`.facts` lists in a `.split`).
8. **04 Toolkit:** `.skill-group` rows of `.tag`s.
9. **Talk to me** (`#talk`): intro + the `.chat` panel.
10. **Footer** (`#hire`, black): giant "Hire me.", email button, copy button, links.

The 404 page copies the header (without `aria-current`) and loads no script.
**A header change must be made in both files.**

### Content rules

1. **The first screen sells.** Name, what he is, when he is free, and a Hire
   me button must all be visible without scrolling, on desktop and phone.
2. **One fact, one home.** Nothing is said twice on the page, except the
   headline numbers in the proof strip.
3. **Mark what matters.** Wrap the one phrase per item that a recruiter should
   remember in `<mark>`. At most one or two per block.
4. **Claims are checkable.** Use the CV's numbers, exactly.
5. **The phone number stays off the site.** It is on the CV only.

## `data-facts`: the page is the model's memory

`site.js` reads the text of every `[data-facts]` element (`#me` and the footer
sentence) into the "Talk to me" model's prompt. **So editing the page updates
what the model knows. There is no second copy of the facts.** Consequences:

- Write facts as plain text in the HTML, not in images or CSS `content`.
- Source order matters: a label must come *after* the heading it describes
  (dates after the job title, category after the project title). CSS moves
  them visually (`grid-area` in `.job`, `order: -1` on `.project__kicker`).
- Links, buttons, images and anything `aria-hidden="true"` are skipped.
  Decoration (section numbers, ticker, rolling word) is `aria-hidden`.
- Lists (`<li>`) are read as one comma-separated line. That is why skill tags
  are `<li>`s.
- To see exactly what the model is told, run in the browser console:
  `document.querySelector("[data-chat]").systemPrompt`

## Talk to me — the local model

A language model that runs **in the visitor's browser** on WebGPU, through the
[WebLLM](https://github.com/mlc-ai/web-llm) library. Nothing typed is sent to
any server. It answers as Htet, in the first person.

- **Config** is the `MODEL` object at the top of `site.js`.
- **Nothing downloads until the visitor presses "Wake it up".** The library
  comes from jsDelivr (pinned version), the weights from Hugging Face, and the
  runtime `.wasm` from GitHub. They are cached in the browser after that.
- **States** (`data-state` on `.chat`): `idle → loading → ready ⇄ busy`, plus
  `error` and `unsupported` (no WebGPU: the panel says so and offers email).
- **Prompt:** `PERSONA` (rules: first person, facts only, one to three short
  sentences, say "I don't have that" and give the email when unsure) + the
  page FACTS. The last six messages are kept as context.
- **Try another model** without editing code: `/?model=<WebLLM model id>#talk`.

__MODEL_SECTION__

## CSS (`assets/css/site.css`)

Four sections, in this order: **Tokens → Base → Components → Layouts.**

**Rules:** no raw colour or size below Tokens (add a token). A component never
sets its own outer margin; the parent spaces it. Names are
`block__element--modifier`. No inline `style=`. No font-size media queries:
type is fluid through `clamp()` tokens (`--text-2xs` … `--text-hero`).

**Colour tokens:** `--bg` (white), `--surface` (off-white band), `--ink`
(black), `--text-muted`, `--text-subtle`, `--line`, `--mark` (the yellow),
`--on-ink-muted`, `--positive` (the green "available" dot), `--critical`.
On white, yellow is only ever a background behind black text. On the black
footer it may be text.

**Type:** Bricolage Grotesque (display, weight 700–800, slightly condensed for
the hero name), Inter (body), JetBrains Mono (labels, dates, metrics).

**Signature pieces:**
- `<mark>`: the highlighter stroke. Inside a `.reveal` it sweeps in.
- **Hard shadow on hover:** `.btn`, `.project` shift up-left and drop a solid
  black shadow (`--shadow-color`; the footer flips it to white).
- 2px black rules (`--rule`) between jobs and around cards.

**Components:** `.section-head` + `.eyebrow`, `.btn` (`--primary` `--mark`
`--ghost` `--quiet` `--lg` `--sm`), `.text-link`, `.site-header` / `.brand` /
`.nav__link` / `.scroll-progress`, `.pill`, `.roller`, `.stamp`, `.stats` /
`.stat`, `.ticker`, `.job`, `.projects` / `.project`, `.list-title` + `.facts`,
`.skill-group` / `.tag-list` / `.tag`, `.chat` (`__bar` `__log` `__gate`
`__chips` `__form`) + `.msg` (`--bot` `--user` `--error` `--typing`) + `.chip`,
`.copy-btn`, `.demo`.
**Layouts:** `.hero`, `.split`, `.talk`, `.site-footer`, `.notfound`.

**Breakpoints** (all `max-width`): `40rem` (header hides the name; projects go
one column), `48rem` (job rows and skill rows stack), `52rem` (hero stacks,
portrait on top), `56rem` (stats 2×2; `.split` and `.talk__inner` stack),
`60rem` (projects two columns).

`[hidden] { display: none !important }` is in Base on purpose: `site.js`
toggles `hidden` on chat parts that set their own `display`.

## Motion

| What | How | Where |
|---|---|---|
| Hero lines rise in on load | CSS `rise` keyframes, staggered | `.hero__content > *` |
| Rolling word | CSS `roll` keyframes over a column of words | `.roller` |
| Spinning stamp | CSS `spin` on the SVG text | `.stamp__ring` |
| Blocks fade up on scroll | JS adds `.is-visible` | `.reveal`, `data-reveal-delay` |
| Marker sweep | CSS transition, triggered by `.is-visible` | `mark` |
| Numbers count up | JS | `[data-count-to]` |
| Ticker | CSS `ticker` keyframes, two identical tracks | `.ticker` |
| Scroll progress line | CSS scroll-driven animation (ignored where unsupported) | `.scroll-progress` |
| Hard-shadow lift | CSS transition on hover | `.btn`, `.project`, `.chip` |
| Chat bubbles, caret | CSS `rise`, `pulse` | `.msg` |

Content is never hidden behind motion: reveals only start hidden when
`html.js` is set (inline script in `<head>`), and everything is visible under
`prefers-reduced-motion` or without `IntersectionObserver`.

## JavaScript (`assets/js/site.js`)

One classic script (an IIFE), loaded at the end of `<body>`. Blocks, in order:

| Block | Hook | Notes |
|---|---|---|
| Model config | `MODEL`, `WEBLLM_URL`, `PERSONA` | Top of the file. |
| Facts | `[data-facts]` | Runs first, before count-up rewrites numbers. |
| Scroll reveal | `.reveal` | Clears its stagger delay afterwards so hovers stay instant. |
| Count-up | `[data-count-to]` | The real number is in the HTML. |
| Nav highlight | `[data-nav]`, `#talk` | "Talk to me" is current at and below `#talk`. |
| Copy | `[data-copy]` | Sets `data-copied` for 1.8 s. |
| Demo dialog | `[data-demo]`, `[data-demo-open]` | The opener is a real link to the video, so it works without JS. Plays at 1.5×. |
| Chat | `[data-chat]` and `[data-chat-*]` | WebLLM is `import()`ed only on "Wake it up". |

**Contract:** JS selects `data-` attributes and ids; CSS selects classes. With
JS off, all of "Me" still reads; only motion, copy, the dialog and the chat go.

## Common edits

- **New CV:** overwrite `HtetMyatAung-CV.pdf`, then update the page to match
  it, then rebuild `finetune/` (below).
- **Add a job:** copy a `<li class="job reveal">`. Order: role, org, dates, points.
- **Add a project:** copy an `<article class="project reveal">`. The `<h3>`
  title first, then the kicker. The first two cards are the wide ones.
- **Change a proof number:** the `.stats` block. `data-count-to` and the text
  inside the span must be the same number.
- **Change the email or a link:** literal HTML; grep the old value. The email
  is also in `site.js` (`EMAIL`), the JSON-LD, `404.html` and `finetune/build_dataset.py`.
- **Change the accent:** `--mark`. Keep it a colour that black text reads on.
- **Change the header:** `index.html` and `404.html`.

## Local preview and checks

```bash
python3 -m http.server 8000   # from the repo root, then http://localhost:8000
```

A server is required (`file://` has no root for `/assets/...`), and WebGPU
needs `localhost` or HTTPS. Before pushing:

- The first screen shows name, pitch, availability and Hire me, at desktop
  width and at 390px.
- Nothing scrolls sideways at 320px.
- In Chrome: press "Wake it up", ask "Why should we hire you?" and "What's
  your visa status?". The first answer must use page facts; the second must
  say it does not know and give the email.
- "Watch demo" opens and plays; "Copy email" copies.
- Every class you add exists in `site.css`; every class you delete is unused.

## Known gaps

- **Small models make mistakes.** The chat can still state something wrong.
  The panel says so and points to the CV. Keep that notice.
- **No WebGPU, no chat.** Older browsers and some phones get the "email me"
  fallback. Everything else on the page works everywhere.
- `myanpay-demo.mp4` is 39 MB in the repo. It only downloads on "Watch demo".
- `CLAUDE.md` and `finetune/` are publicly readable on the live site
  (`.nojekyll` serves every file). Nothing in them is private. Keep it so.
