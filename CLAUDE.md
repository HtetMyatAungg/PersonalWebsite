# CLAUDE.md — design of this codebase

Personal site for Htet Myat Aung, served by GitHub Pages at **htetmyataung.uk**.
Hand-written static HTML/CSS/JS: **no framework, no build step, no
dependencies, no package.json.** Edit, commit, push to `main`, live in about a
minute.

**The site has one job: make a visitor want to hire Htet.** Every decision
below serves that. **The audience is research labs:** the page sells him for
Summer 2027 research internships in academic or industry AI labs (owner's
decision, Nov 2026). Lead with research; industry work is secondary.

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
  from `HtetMyatAung-CV.pdf` (the one-page research CV, Nov 2026). Where the
  new CV reworded or corrected a fact, the page follows it. Some items come
  from the previous CV and are kept because they are still true: the
  Financial Sentiment, NEO and Sentinel projects, the leadership details
  (workshops, Dronathon, THE speaker, "selected from hundreds"), and "Top 5"
  for UKCISA. **MyanPay** is on the page because the owner asked for it.
  The owner wrote the MSc-seminars line directly. Add nothing that is not
  on a CV or stated by the owner.
- **MyanLearn is gone, on purpose.** The owner stopped it. Do not bring back
  the project or the "18+ countries" figure.
- **The page is dynamic.** Motion is part of the brief (see *Motion*). All of
  it must switch off under `prefers-reduced-motion`.
- **"Talk to me" must be fast and must not crash.** The owner rejected a
  version that was "laggy and doesn't work a lot of the time". Read *Talk to
  me* before touching the model.
- **No tooling.** The header is plain HTML in both HTML files. `finetune/`
  holds a training-data script; the site never runs it.

## File map

```
index.html              The whole site: Me (hero, proof, research, publication,
                        projects, background, toolkit), Talk to me (chat), footer ("Hire me.")
404.html                Not-found page AND the legacy-URL redirect table
assets/css/site.css     The only stylesheet
assets/js/site.js       The page script: motion, copy, demo dialog, the chat
assets/js/llm-worker.js Three lines of code. Runs the chat model off the main thread.
assets/media/           avatar.jpg (header), portrait.png (hero, og:image),
                        icon.png (favicon), myanpay-demo.mp4 (39 MB, demo dialog)
HtetMyatAung-CV.pdf     The CV. Overwrite it, keep the filename.
finetune/               Training data for the "Talk to me" model (see below)
CNAME, .nojekyll        Custom domain; stops Pages running Jekyll. Keep both.
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
2. **Hero:** pill ("Available · Summer 2027 research internships") → name →
   "ML researcher who *tests. / builds. / leads.*" (rolling word) → one line
   of context → **Hire me**, Talk to me, CV. Portrait on a yellow offset
   block, with a spinning "HIRE ME · SUMMER 2027" stamp that is itself a
   mailto link. **Rolling words must be 7 characters or fewer** ("builds."):
   with "measures." the pitch wraps to two lines at 1280px and pushes Hire me
   off a 1280×600 screen. Measured.
3. **Proof strip:** four numbers that count up: `100%` (pass rate, up from
   0%), `10 LLMs` evaluated, `300` datasets checked, `30+` (UROP applicants;
   the only first-year selected).
4. **Ticker:** decorative skills marquee (`aria-hidden`).
5. **01 Research** (`#work`): four `.job` rows in the CV's order: UROP,
   Formal Verification (upcoming), Volunteer RA, ISG Smart Card and IoT
   Security Centre. Source order is role, org, dates, points.
6. **02 Publication** (`#publication`): LARP, as a `.job` row with no points
   (title, author, venue). Keep the heading one word: "Publications" is 1px
   too wide at 320px.
7. **03 Projects:** six `.project` cards in two even columns, each linked to
   its repo: Toy Models of Superposition, First-Order Unification Engine
   (the research pair), Financial Sentiment Classifier, NEO Hazard
   Classifier, Sentinel, MyanPay. MyanPay's "Watch demo" opens a `<dialog>`.
8. **04 Background:** Leadership, then Industry (Sharper Logs) | Education
   (`.facts` lists in a `.split`). Research interests are an Education item,
   as on the CV.
9. **05 Toolkit:** `.skill-group` rows of `.tag`s: ML, Research, Languages,
   Engineering (the CV's groups, plus the methods from the previous CV), Spoken.
10. **Talk to me** (`#talk`): intro + the `.chat` panel.
11. **Footer** (`#hire`, black): giant "Hire me.", email button, copy button, links.

The 404 page copies the header (without `aria-current`) and loads no script.
**A header change must be made in both files.**

### Content rules

1. **The first screen sells.** Name, what he is, when he is free, and a Hire
   me button must all be visible without scrolling, down to a 1280×600 laptop
   viewport and a 320px phone. This is tested; see *Checks*.
2. **One fact, one home.** Nothing is said twice on the page, except the
   headline numbers in the proof strip.
3. **Mark what matters.** Wrap the one phrase per item that a recruiter should
   remember in `<mark>`. At most one or two per block.
4. **Claims are checkable.** Use the CV's numbers, exactly.
5. **The phone number stays off the site.** It is on the CV only.

## `data-facts`: the page is the model's memory

`site.js` reads the text of every `[data-facts]` element into the lookup table
the "Talk to me" model answers from: `#me`, the one-line intro of the chat,
and the footer sentence. **So editing the page updates what the model knows.
There is no second copy of the facts in the site.**

- Write facts as plain text in the HTML, not in images or CSS `content`.
- **One fact per sentence.** The model may only restate a sentence, or up to
  three neighbouring ones. A fact split across two list items cannot be said.
- Source order matters: a label must come *after* the heading it describes
  (dates after the job title, category after the project title). CSS moves
  them visually (`grid-area` in `.job`, `order: -1` on `.project__kicker`).
- Each `### ` heading (`<h3>`) starts a **topic**; its first line says what it
  is (employer and dates, category). A list item (`<li>`) is one line; an item
  with two paragraphs reads "heading — detail". Bare tags join with commas.
- Links, buttons, images and anything `aria-hidden="true"` are skipped.
  Decoration (section numbers, ticker, rolling word) is `aria-hidden`.
- To see what the model can be handed, in the browser console:
  `document.querySelector("[data-chat]").facts`

## Talk to me — the local model

A language model that runs **in the visitor's browser** on WebGPU, through the
[WebLLM](https://github.com/mlc-ai/web-llm) library. Nothing typed is sent to
any server. **Nothing downloads until the visitor presses "Wake it up".** The
library comes from jsDelivr (pinned version), the weights from Hugging Face,
the runtime `.wasm` from GitHub. The browser caches them after that.

### How an answer is made (read this before changing anything)

A model small enough to run well in a browser **cannot be trusted to speak
for Htet from the whole page**. Measured with four stock models and four
prompt designs: given all the facts, they mix them up or invent ("I'm
available June to September 2026", "Yes, I know Rust", "I won the award").
So the model is never asked to recall anything. For each question:

1. **`notesFor(question)`** picks the topic (sometimes two) whose words best
   match the question, and up to six of its lines.
2. **The model** rephrases those notes as a short first-person answer.
3. **`supported(answer, notes)`** checks the answer. Every sentence must
   restate one page sentence, or up to three neighbours in the same line:
   every number and every word must be there (or be a form of a word that is,
   or a harmless joining word in `GLUE`).
4. **If the check fails, the visitor gets the page's own lines** ("From my
   page: …"). If nothing on the page matches the question, the model is not
   asked at all and a fixed "that is not on my page" reply is shown.

**So every answer is either verified against the page or quoted from it.**
On the 14-question test, a stock model answers about a third in its own
words; the rest are quotes or the fixed reply. All of them are true.

Do not weaken this to make the model "sound better":

- `GLUE` holds only words that cannot create a claim. Verbs like *built, won,
  led, wrote, founded* are deliberately absent: "I built PyTorch" must fail.
- A second topic is only handed over when it scores within 70% of the first
  (`CLOSE_ENOUGH`). Otherwise two true facts get welded into a false one
  (measured: a replication "done at the DICE Lab").
- Answers are **not streamed**: nothing is shown until it has passed the
  check. The finished text is then typed out by `typeOut()`.
- The remaining risk is a sentence that reuses one page sentence's words to
  say something else. It has not been seen, but word-matching cannot rule it
  out.

**When a real question gets a poor answer**, look at
`document.querySelector("[data-chat]").last` (question, notes, the model's
draft, whether it passed):

- Wrong or no notes → add the visitor's word to `ALSO` in `site.js`, mapped to
  words that *are* on the page for that topic.
- Right notes, draft rejected → that is the model's wording; a quote was shown
  instead. Nothing to fix, short of a better model.

### What keeps it fast and alive (measured on an Intel integrated GPU)

The first version put a 1.5B model on the main thread with the whole page as
its prompt. It took **43 s** for the first answer, then lost the GPU ("Device
was lost") and failed every question after. The owner rejected it. Now:

| Problem | Fix | Where |
|---|---|---|
| Page froze while the model loaded and wrote | The model runs in a worker | `llm-worker.js`, `createEngine()` |
| Long wait before every answer | Each question is a tiny fresh prompt: a few notes plus the question | `answer()` |
| First answer slow | `warmUp()` runs one throwaway answer during loading | `load()` |
| Dead time while waking | A question typed during the wake is held, then answered | `ask()`, `queued` |
| GPU dropped the model, chat died | `revive()` reloads it (cached, seconds) and asks again, once | `respond()` |
| Model too heavy | A 1B model at most. See `MODEL` | top of `site.js` |

Measured with the current default, through the real chat panel: **wake 8 s**
once cached, **answers in 1.5–4.5 s**, 14 of 14 questions answered, and it
kept answering after the GPU process was killed. The first visit also
downloads the model (700 MB).

**Do not pick a bigger model** without re-running the checks below on an
integrated GPU. Size is download time, wake time and crash risk.

- **States** (`data-state` on `.chat`): `idle → loading → ready ⇄ busy`, plus
  `error` (a dropped download says so and can be retried) and `unsupported`
  (no WebGPU: the panel says so and offers email).
- **Try another model** without editing code: `/?model=<WebLLM model id>#talk`.

### Model choice

`MODEL.id` is `Llama-3.2-1B-Instruct-q4f16_1-MLC`. All of these were run
through the real page on the same machine, on the same 14 questions:

| Model | Download | Wake (cached) | Answers in its own words | False statements shown |
|---|---|---|---|---|
| **Llama 3.2 1B** (default) | 700 MB | 8 s | most of the three | none |
| Gemma 3 1B | 600 MB | 8 s | terse fragments | none |
| Qwen2.5 0.5B | 290 MB | 5 s | fewest; mostly quotes | none |
| Qwen2.5 1.5B, whole page as prompt (first version) | 880 MB | — | — | several, then crashed |

Gemma and Qwen were last run one revision of the check earlier. The check
has only got stricter since, so it can only show fewer of their answers.

`Qwen2.5-0.5B-Instruct-q4f16_1-MLC` is the choice if download size matters
more than phrasing: change `id` and `sizeMB` (290).

### Swapping in the fine-tuned model

The model on the site today is a **stock** model. It does not know Htet; it
rephrases what the page hands it. A fine-tuned one does not exist yet. What it
would add is better phrasing, so more answers pass the check and fewer fall
back to quotes. To make it:

1. **Train.** Fine-tune the stock model named in `MODEL` (get it from Hugging
   Face: `meta-llama/Llama-3.2-1B-Instruct`, or `Qwen/Qwen2.5-0.5B-Instruct`
   for the small one) on `finetune/htet.jsonl`. It is standard chat-format
   JSONL. If the service returns a LoRA adapter, merge it into the base so
   you have full weights.
2. **Convert for the browser** with [MLC LLM](https://llm.mlc.ai/docs/install/mlc_llm.html).
   Only the weights need converting; the stock model's runtime is reused:
   ```bash
   mlc_llm convert_weight ./htet-merged/ --quantization q4f16_1 -o ./htet-MLC/
   mlc_llm gen_config ./htet-merged/ --quantization q4f16_1 --conv-template llama-3_1 -o ./htet-MLC/
   ```
   `--conv-template` is `llama-3_1` for Llama 3.2, `qwen2` for Qwen2.5,
   `gemma3_instruction` for Gemma 3.
3. **Upload** the `htet-MLC` folder to a public Hugging Face model repo.
4. **Point the site at it.** In `MODEL` at the top of `site.js`:
   ```js
   id: "htet-v1",                                   // any unique name
   weights: "https://huggingface.co/<you>/<repo>",  // step 3
   base: "Llama-3.2-1B-Instruct-q4f16_1-MLC",       // the stock model it came from
   sizeMB: <download size>,
   ```
5. **Test** with the checks below before pushing. The check in step 3 of
   "How an answer is made" stays on for the fine-tuned model too.

The fine-tune must use the **same base and the same `q4f16_1` quantization**
as a model in WebLLM's built-in list, or there is no runtime for it. This
path (steps 2–4) follows the MLC and WebLLM docs but has not been run here:
there was no fine-tuned model to run it with.

### `finetune/`

- `htet.jsonl` — the training set, about 400 conversations in exactly the
  shape the site sends: `NOTES` + `QUESTION` in, a short first-person answer
  out. About 350 are answered from the notes; about 50 decline because the
  notes do not hold the answer.
- `build_dataset.py` — writes it. Edit `TOPICS` when a fact changes.
- `persona.txt`, `facts.txt` — what the site tells the model, and every line
  it can hand it. Refresh both after editing the page; in the browser console:
  `copy(document.querySelector("[data-chat]").persona)` and
  `copy(document.querySelector("[data-chat]").facts)`, each pasted over its
  file. Then re-run the script.

**Training answers must pass the site's own check**, or the model learns to
say things the site throws away. Write them one fact per sentence, in the
page's words (the rules are in the comment above `TOPICS`). To measure, for
each answer run in the console
`document.querySelector("[data-chat]").supported(answer, question)`. When
last measured (Nov 2026, one careful phrasing per question, contact answers
left out), 178 of 199 passed (89%). Every failure was routing (the question
fetches other notes on the site), none was wording.

The dataset teaches **manner and the page's facts**, not Htet's personal
writing voice: it was written from the CV, not from his own messages.

## CSS (`assets/css/site.css`)

Four sections, in this order: **Tokens → Base → Components → Layouts.**

**Rules:** no raw colour or size below Tokens (add a token). A component never
sets its own outer margin; the parent spaces it. Names are
`block__element--modifier`. No inline `style=`. No font-size media queries:
type is fluid through `clamp()` tokens (`--text-2xs` … `--text-hero`).

**Colour tokens:** `--bg` (white), `--surface` (off-white band), `--ink`
(black), `--text-muted`, `--text-subtle`, `--line`, `--mark` (the yellow),
`--on-ink-muted`, `--positive` (the green "available" dot), `--critical`,
`--backdrop`. On white, yellow is only ever a background behind black text.
On the black footer it may be text.

**Type:** Bricolage Grotesque (display, weight 700–800; `--font-display-tight`
is its condensed cut for the hero name and the footer shout), Inter (body),
JetBrains Mono (labels, dates, metrics).

**Fallback fonts are size-matched, on purpose.** The two `@font-face` rules at
the top of Base ("Display Fallback", "Display Fallback Tight") shrink the
system bold to the web font's measured width. Without them the hero name
wraps to three lines before the web font arrives and pushes "Hire me" off the
first screen. `--text-hero` is also capped by viewport height (`17vh`) for
the same reason. Do not remove either.

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
words first, portrait second), `56rem` (stats 2×2; `.split` and
`.talk__inner` stack).

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

## JavaScript

`assets/js/site.js` is one classic script (an IIFE), loaded at the end of
`<body>`. Blocks, in order:

| Block | Hook | Notes |
|---|---|---|
| Model config | `MODEL`, `WEBLLM_URL`, `WORKER_URL` | Top of the file. |
| How an answer is made | `PERSONA`, `[data-facts]`, `TOPICS`, `ALSO`, `notesFor`, `GLUE`, `supported`, `quote` | Reading the page runs first, before count-up rewrites numbers. |
| Scroll reveal | `.reveal` | Clears its stagger delay afterwards so hovers stay instant. |
| Count-up | `[data-count-to]` | The real number is in the HTML. |
| Nav highlight | `[data-nav]`, `#talk` | "Talk to me" is current at and below `#talk`. |
| Copy | `[data-copy]` | Sets `data-copied` for 1.8 s. |
| Demo dialog | `[data-demo]`, `[data-demo-open]` | The opener is a real link to the video, so it works without JS. Plays at 1.5×. |
| Chat | `[data-chat]` and `[data-chat-*]` | See *Talk to me*. |

`assets/js/llm-worker.js` is a module worker that hosts the model. Its WebLLM
version must match `WEBLLM_URL` in `site.js`.

**Contract:** JS selects `data-` attributes and ids; CSS selects classes. With
JS off, all of "Me" still reads; only motion, copy, the dialog and the chat go.

## Common edits

- **New CV:** overwrite `HtetMyatAung-CV.pdf`, update the page to match it,
  then rebuild `finetune/` (see *Talk to me*).
- **Add a job:** copy a `<li class="job reveal">`. Order: role, org, dates, points.
- **Add a project:** copy an `<article class="project reveal">`. The `<h3>`
  title first, then the kicker. Cards sit in two even columns; alternate
  `data-reveal-delay="80"` on the right-hand ones.
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

- The first screen shows name, pitch, availability and Hire me at desktop
  width, on a short laptop (1280×600) and at 320–390px. Check once with web
  fonts blocked: the layout must be the same.
- Nothing scrolls sideways at 320px.
- In Chrome: press "Wake it up" and type a question straight away. It must
  be answered once the model is awake.
- Ask "What are you working on now?", "Do you know Rust?" and "What's your
  visa status?". The first must be true. The second must not claim Rust (it
  shows the toolkit). The third must say it is not on the page and give the
  email. Each should take a few seconds at most.
- Ask ten questions in a row. It must keep answering (no "That did not work").
- After editing the page, ask about what you changed and read `chat.last`.
- "Watch demo" opens and plays; "Copy email" copies.
- Every class you add exists in `site.css`; every class you delete is unused.

## Known gaps

- **No WebGPU, no chat.** Older browsers and some phones get the "email me"
  fallback. Everything else on the page works everywhere. Only Chromium on
  Linux was tested; Safari, Firefox and phones were not.
- **The chat is true, not always apt.** It can answer from the wrong topic or
  fall back to a quote. It should not state anything the page does not.
- **`revive()` has not been triggered by a real device loss.** The test killed
  the GPU process and the chat kept working, but Chrome recovered by itself
  before the reload path was needed.
- The spoken-languages line (Chinese, Japanese) and the favicon were changed
  by the owner directly. They are not on the CV. Keep them.
- `myanpay-demo.mp4` is 39 MB in the repo. It only downloads on "Watch demo".
- `CLAUDE.md` and `finetune/` are publicly readable on the live site
  (`.nojekyll` serves every file). Nothing in them is private. Keep it so.
- MyanPay, the Financial Sentiment, NEO and Sentinel projects, and some
  leadership details are on the site but not on the current CV. If the CV
  is the only thing a recruiter reads, they will not see them.
- At exactly 1280×600 the bottom 6px of the hero's Hire me button fall below
  the fold (it was the same before the research rewrite). The header's Hire
  me is always visible.
- The word "first" in a question can pull in the First-Order Unification
  Engine card (its heading words count triple). "Which project should I look
  at first?" gets that card. `ALSO` maps `year` and `class` to Education so
  "first year" and "First Class" still land there.
- The research rewrite (Nov 2026) was not tested with the live model: it was
  not cached on the test browser. Topic routing and the answer check were
  tested. Run the *Checks* list in Chrome before pushing.
