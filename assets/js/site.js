/*
 * site.js — the only script. Loaded at the end of <body>.
 *
 * Each block is independent and does nothing when its markup is absent.
 * JavaScript selects data- attributes and ids; CSS selects classes.
 *
 * With JS off, the whole "Me" section still reads in full. Only motion, the
 * copy button, the demo dialog and "Talk to me" need JS.
 */

(function () {
    "use strict";

    const EMAIL = "henry.htetmyataung@gmail.com";

    /* ======================================================================
       TALK TO ME — model configuration

       The model runs in the visitor's browser on WebGPU, through WebLLM.
       Nothing the visitor types leaves their device.

       Keep the model SMALL. Most laptops have an integrated GPU: a 1.5B model
       took 40 s per answer on one and then crashed it ("device lost"). Size is
       also the download the visitor waits for.

       `id` is a model from WebLLM's built-in list. To switch to the model
       fine-tuned on Htet (see CLAUDE.md, "Swapping in the fine-tuned model"):
         weights: URL of the Hugging Face repo holding the MLC-converted weights
         base:    WebLLM id of the stock model it was fine-tuned from
         id:      any unique name for it, e.g. "htet-llama-1b"
       Leave `weights` null to use the stock model.

       To try another model without editing this file: /?model=<WebLLM id>#talk
       ====================================================================== */
    const MODEL = {
        id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        sizeMB: 700,
        weights: null,
        base: null,
    };

    /* Same version in llm-worker.js. Change both together. */
    const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.88/+esm";
    const WORKER_URL = "/assets/js/llm-worker.js";

    /* ======================================================================
       HOW AN ANSWER IS MADE

       A model small enough to run well in a browser cannot be trusted to speak
       for Htet from the whole page: given all the facts it mixes them up or
       invents ("available June to September 2026"). Measured, repeatedly. So
       the model is never asked to recall anything. For each question:

         1. notesFor()   picks the few lines of the page that match the question
         2. the model    rephrases those lines as a short first-person answer
         3. supported()  checks every number, name and word of the answer
                         against those lines
         4. if the check fails, the visitor gets the page's own lines instead

       So an answer is either verified against the page or quoted from it.
       A question that matches nothing on the page never reaches the model.
       ====================================================================== */

    const PERSONA = [
        "You are the AI version of Htet Myat Aung on his personal website.",
        "Answer the QUESTION as Htet, in the first person (\"I built...\").",
        "Use ONLY the NOTES. Do not add any fact, number or name that is not in the NOTES.",
        "One or two short sentences. Plain text.",
    ].join("\n");

    /* ---- Facts: read the page into lines -----------------------------------
       One list of lines per [data-facts] element. Runs first, before the
       count-up animation rewrites any numbers. Links, buttons, images and
       decorative (aria-hidden) nodes are skipped. */
    const FACT_ROOTS = (function readFacts() {
        const SKIP = 'a, button, nav, svg, img, video, script, [aria-hidden="true"]';
        const BLOCK = /^(P|H1|H2|H3|DIV|SECTION|ARTICLE|UL|OL|DL)$/;

        const read = (root) => {
            const lines = [];
            let line = "";
            let item = 0;             /* > 0 while inside a list item */

            const flush = () => {
                const text = line.replace(/\s+/g, " ").trim().replace(/,$/, "");
                if (text) lines.push(text);
                line = "";
            };

            const walk = (node) => {
                if (node.nodeType === Node.TEXT_NODE) { line += node.nodeValue; return; }
                if (node.nodeType !== Node.ELEMENT_NODE || node.matches(SKIP)) return;

                const tag = node.tagName;
                /* Inside a list item, paragraphs join into one line: a heading and its
                   detail belong together ("... Awards 2026 — Finalist. Top 5."). */
                const block = BLOCK.test(tag) && !(item && tag === "P");
                if (block || tag === "DT") flush();
                if (item && tag === "P" && line.trim()) line = line.trimEnd() + " — ";
                if (tag === "H2") line += "## ";
                if (tag === "H3") line += "### ";
                if (tag === "LI") item += 1;
                node.childNodes.forEach(walk);
                if (tag === "DT") line += ": ";              /* "100%: Pass rate on ..." */
                if (tag === "LI") {
                    item -= 1;
                    line = line.trimEnd();
                    if (node.querySelector("p") || /[.!?]$/.test(line)) flush();    /* an entry or a sentence: its own line */
                    else if (line) line += ", ";                                    /* a bare tag: "PyTorch, XGBoost, ..." */
                }
                if (block || tag === "DD") flush();
            };

            walk(root);
            flush();
            return lines;
        };

        return Array.from(document.querySelectorAll("[data-facts]"), read);
    })();

    /* ---- Topics --------------------------------------------------------------
       The page as the model's lookup table. One topic per ### heading (a job, a
       project, a list), plus "About": the lines above the first section (name,
       pitch, headline numbers) and the footer sentence. */
    const TOPICS = [{ heading: "About", lines: [] }];
    let section = "";

    (FACT_ROOTS[0] || []).forEach((line) => {
        if (line.startsWith("## ")) section = line.slice(3);
        else if (line.startsWith("### ")) TOPICS.push({ section, heading: section + ": " + line.slice(4), lines: [] });
        else TOPICS[TOPICS.length - 1].lines.push(line);
    });
    FACT_ROOTS.slice(1).forEach((lines) => { TOPICS[0].lines.push(...lines); });
    TOPICS[0].lines.push("Email: " + EMAIL);

    /* A section made only of one-line topics (Toolkit: five short lists) becomes
       one topic, so "do you know X?" is answered with every list in view. */
    Array.from(new Set(TOPICS.map((topic) => topic.section).filter(Boolean))).forEach((name) => {
        const own = TOPICS.filter((topic) => topic.section === name);
        if (own.length < 2 || own.some((topic) => topic.lines.length !== 1)) return;
        const lines = own.map((topic) => topic.heading.slice(name.length + 2) + ": " + topic.lines[0]);
        TOPICS.splice(TOPICS.indexOf(own[0]), own.length, { section: name, heading: name, lines });
    });

    /* Words that carry no topic. */
    const STOP = new Set(("a an and are as at be but by can could did do does for from had has have he her his how i if in "
        + "is it its me my of on or our she so than that the their them they this to us was we were what when where which "
        + "who whom why will with would you your about tell any some please give much many am im ive not no yes").split(" "));

    /* Words visitors use that the page does not, and the page words they mean.
       Add a line here when a real question fails to find its topic. */
    const ALSO = {
        /* who he is, why hire him: About */
        yourself: "builds available", introduce: "builds available", summarise: "builds available",
        pitch: "builds available", hi: "builds available", hello: "builds available", hey: "builds available",
        hire: "pass evaluated builds", strength: "pass evaluated builds", best: "pass evaluated builds",
        candidate: "pass evaluated builds", superpower: "pass evaluated builds", apart: "pass evaluated builds",
        available: "available summer", start: "available summer", free: "available summer", open: "available summer",
        internship: "available summer", role: "available summer", looking: "available summer",
        interest: "education background interests neurosymbolic interpretability evaluation", interested: "education background interests neurosymbolic interpretability evaluation",
        focus: "education background interests neurosymbolic interpretability evaluation", passion: "education background interests neurosymbolic interpretability evaluation",
        contact: "email reply", reach: "email reply", touch: "email reply",
        located: "based", location: "based", live: "based",
        real: "version device", person: "version device", human: "version device", bot: "version device", talking: "version device",
        private: "device leaves", privacy: "device leaves", data: "device leaves", store: "device leaves",
        /* research */
        research: "urop fellow", supervisor: "stathis prof", supervise: "stathis prof", advisor: "stathis prof",
        supervised: "stathis prof", professor: "stathis prof",
        find: "found ceiling scaffolding", finding: "found ceiling scaffolding", discover: "found ceiling scaffolding",
        result: "found ceiling scaffolding", conclusion: "found ceiling scaffolding",
        test: "causal experiments pipeline", tested: "causal experiments pipeline", experiment: "causal experiments pipeline",
        designed: "pipeline", improve: "schema lifted", competitive: "selected applied", author: "author report larp",
        bug: "evaluator fixed", mistake: "evaluator fixed",
        generalise: "memorise unguided ceiling scaffolding", generalize: "memorise unguided ceiling scaffolding",
        publication: "publication larp preprint", publish: "publication larp preprint", published: "publication larp preprint",
        preprint: "publication larp", arxiv: "publication larp", larp: "publication",
        formal: "verification twins", verify: "formal verification", twin: "formal verification", upcoming: "upcoming winter",
        next: "upcoming winter", future: "upcoming winter", symbolic: "neurosymbolic unification", logic: "prolog unification",
        /* work */
        now: "now", current: "now", currently: "now", working: "now", today: "now", latest: "now",
        job: "research engineer", company: "industry sharper", industry: "industry sharper", employer: "research",
        startup: "industry sharper", commercial: "industry sharper",
        optimising: "target core memory", constraint: "target core memory", hardware: "target core",
        security: "intrusion detector", benchmark: "benchmarking harness", accuracy: "measured accuracy",
        implemented: "implemented scratch", reliable: "validation gates", output: "validation gates",
        /* education */
        study: "education bsc", studying: "education bsc", degree: "education bsc", university: "education holloway",
        grade: "education average", record: "education average", year: "education average class", class: "education average", graduate: "education", finish: "education", end: "education",
        award: "education scholarship", won: "education scholarship", honour: "education scholarship",
        module: "education", course: "education bluedot", covered: "education modules",
        math: "education algebra", school: "education",
        /* leadership */
        lead: "leadership president founder", leader: "leadership president founder",
        outside: "leadership president", extracurricular: "leadership president",
        team: "leadership battlecode", teamwork: "leadership battlecode", player: "leadership battlecode",
        society: "leadership president", club: "leadership president",
        teach: "leadership workshop", taught: "leadership workshop", teaching: "leadership workshop", explain: "leadership workshop",
        speaking: "leadership speaker", confident: "leadership speaker",
        /* toolkit */
        skill: "toolkit", stack: "toolkit", tech: "toolkit", technology: "toolkit", tool: "toolkit",
        language: "toolkit", know: "toolkit", familiar: "toolkit", used: "toolkit", comfortable: "toolkit",
        programming: "toolkit", coding: "toolkit", framework: "toolkit", method: "toolkit", evaluate: "toolkit evaluation",
        speak: "toolkit spoken",
        /* projects */
        project: "projects", built: "projects", build: "projects", made: "projects", shipped: "projects", portfolio: "projects",
        paper: "publication larp replication", replicate: "replication", replicated: "replication",
        interpretability: "superposition anthropic", anthropic: "superposition", speech: "whisper spoken",
        imbalanced: "hazard", nasa: "hazard", hackathon: "hackathon",
    };

    const MONTHS = /^(jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(uary|ruary|ch|il|e|y|ust|tember|ober|ember)$/;

    const wordsOf = (text) => (text.toLowerCase().match(/[a-z0-9]+/g) || [])
        .filter((word) => word.length > 1 && !STOP.has(word))
        .map((word) => word.replace(MONTHS, "$1"))                                      /* september -> sep */
        .map((word) => (word.length > 3 ? word.replace(/([^s])s$/, "$1") : word));     /* projects -> project */

    TOPICS.forEach((topic) => {
        topic.lineWords = topic.lines.map((line) => new Set(wordsOf(line)));
        topic.headingWords = new Set(wordsOf(topic.heading));
        topic.words = new Set(wordsOf(topic.heading + " " + topic.lines.join(" ")));
    });

    const TOPICS_PER_QUESTION = 2;
    const LINES_PER_TOPIC = 6;
    const CLOSE_ENOUGH = 0.7;     /* a second topic must score this share of the first */

    /* The notes for one question: from the topics that share the most words with
       it, the lines that share the most words with it, in page order. A word in
       a heading counts three times; a typed word counts twice an implied one.
       Usually one topic, two when they match about equally. Returns [] when
       nothing on the page matches. */
    const notesFor = (question) => {
        const asked = new Map();      /* word -> weight: 2 if typed, 1 if implied by ALSO */
        const typed = wordsOf(question);
        (typed.length ? typed : ["introduce"]).forEach((word) => {      /* "who are you?" has no topic words */
            asked.set(word, 2);
            wordsOf(ALSO[word] || "").forEach((extra) => { if (!asked.has(extra)) asked.set(extra, 1); });
        });

        const weigh = (words, headingWords) => {
            let score = 0;
            asked.forEach((weight, word) => {
                if (words.has(word)) score += weight * (headingWords && headingWords.has(word) ? 3 : 1);
            });
            return score;
        };

        const ranked = TOPICS
            .map((topic) => ({ topic, score: weigh(topic.words, topic.headingWords) }))
            .filter((entry) => entry.score > 0)
            .sort((x, y) => y.score - x.score);

        /* A weaker second topic is how two true facts become one false sentence
           (measured: a replication "done at the DICE Lab"). Only near-equals go along. */
        return ranked
            .filter((entry) => entry.score >= ranked[0].score * CLOSE_ENOUGH)
            .slice(0, TOPICS_PER_QUESTION)
            .map(({ topic }) => {
                /* The first line of a topic says what it is (employer, category), so it always
                   goes along. Then the best-matching lines, topped up with the opening ones. */
                const scored = topic.lines.map((line, index) => ({ index, score: weigh(topic.lineWords[index]) }));
                const chosen = scored
                    .map((entry) => (entry.index === 0 ? { index: 0, score: Infinity } : entry))
                    .sort((x, y) => y.score - x.score || x.index - y.index)
                    .slice(0, topic === TOPICS[0] ? topic.lines.length : LINES_PER_TOPIC);     /* About goes whole */
                const inOrder = (entries) => entries.map((entry) => entry.index).sort((x, y) => x - y).map((index) => topic.lines[index]);
                const matched = scored.filter((entry) => entry.score > 0);
                return {
                    heading: topic.heading,
                    lines: inOrder(chosen),                                         /* what the model reads */
                    matched: inOrder(matched.length ? matched : chosen),            /* what a quote shows */
                };
            });
    };

    const notesText = (notes) => notes
        .map((note) => "[" + note.heading + "]\n" + note.lines.map((line) => "- " + line).join("\n"))
        .join("\n");

    /* Words a first-person answer may add without the page saying them. Kept to
       words that cannot create a claim. Verbs like built, won, led, wrote or
       founded are NOT here on purpose: "I built PyTorch" must fail. */
    const GLUE = new Set(("also and both then here there currently now today still since during while one lot well very just "
        + "only include including called named use used using know work worked working found study studying studied").split(" "));

    /* Is every claim in the answer backed by the notes? Sentence by sentence.
       Each sentence of the answer must restate ONE sentence of the page, or up to
       three that sit next to each other in the same line. Against that small window
       (plus the topic's heading and opening line):
         - every number in the answer sentence must appear;
         - every word must appear, or be a form of a word that does
           (memorize ~ memorise, researcher ~ research), or be GLUE.
       Nothing else is allowed in. That is deliberately strict: it is what stops
       "I won the award" (the page says finalist), "a finalist in the ISC
       Scholarship" (two different lines) and "the replication was done at the
       DICE Lab" (two different topics). The cost is that some true answers fail
       too; they are shown as a quote instead, which is also true.
       And the answer must not address the visitor as Htet ("your research"). */
    const WINDOW = 3;             /* neighbouring page sentences one answer sentence may draw on */

    const supported = (answer, notes) => {
        if (/\byou(r|rs)?\b/i.test(answer)) return false;

        const windows = [];
        notes.forEach((note) => {
            /* What the topic is (its heading and opening line: employer, dates,
               category) may back any sentence about it. */
            const about = note.heading + " " + note.lines[0] + " ";
            note.lines.forEach((line) => {
                const parts = line.split(/(?<=[.!?])\s+|\s+—\s+/).filter(Boolean);
                parts.forEach((part, index) => {
                    windows.push(about + parts.slice(index, index + WINDOW).join(" "));
                });
            });
        });

        const sources = windows.map((text) => {
            const known = new Set(wordsOf(text));
            const stems = new Set(Array.from(known).filter((word) => word.length >= 6).map((word) => word.slice(0, 6)));
            return { text, backed: (word) => known.has(word) || GLUE.has(word) || (word.length >= 6 && stems.has(word.slice(0, 6))) };
        });

        const sentences = answer.split(/(?<=[.!?])\s+/).filter((sentence) => /[A-Za-z0-9]/.test(sentence));
        let claims = 0;

        const stands = sentences.every((sentence) => {
            const numbers = sentence.match(/\d[\d.,]*\d|\d/g) || [];
            const content = wordsOf(sentence).filter((word) => !GLUE.has(word));
            claims += content.length;
            return sources.some((source) =>
                numbers.every((number) => source.text.includes(number)) && content.every(source.backed));
        });

        return stands && claims > 0;
    };

    /* The page's own words, for when the model's answer fails the check. */
    const quote = (notes) => "From my page:\n" + notes[0].matched.join("\n");

    const NOT_ON_PAGE = "That is not on my page, so I won't guess. I can tell you about my research, my projects and my background. "
        + "For anything else, email me: " + EMAIL;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canObserve = "IntersectionObserver" in window;

    /* ---- Scroll reveal ----------------------------------------------------
       class="reveal" fades a block up on entry; data-reveal-delay="80" (ms)
       staggers siblings. <mark> inside it sweeps in (CSS). Revealed once. */
    const revealTargets = document.querySelectorAll(".reveal");

    if (reducedMotion || !canObserve) {
        revealTargets.forEach((el) => el.classList.add("is-visible"));
    } else {
        const revealer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const delay = Number(el.dataset.revealDelay || 0);
                el.style.transitionDelay = delay + "ms";
                el.classList.add("is-visible");
                revealer.unobserve(el);
                /* Drop the stagger afterwards so it never delays a hover. */
                setTimeout(() => { el.style.transitionDelay = ""; }, delay + 800);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
        revealTargets.forEach((el) => revealer.observe(el));
    }

    /* ---- Count-up numbers --------------------------------------------------
       <span data-count-to="100">100</span> counts from 0 when scrolled into
       view. The real number is in the HTML, so it is right without JS. */
    if (!reducedMotion && canObserve) {
        const counter = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = Number(el.dataset.countTo);
                const started = performance.now();
                const DURATION = 1200;
                counter.unobserve(el);

                const tick = (now) => {
                    const t = Math.min(1, (now - started) / DURATION);
                    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
                    if (t < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
        }, { threshold: 0.6 });
        document.querySelectorAll("[data-count-to]").forEach((el) => counter.observe(el));
    }

    /* ---- Nav highlight -----------------------------------------------------
       Two destinations. "Talk to me" is current once #talk reaches the middle
       of the viewport, and stays current below it; above it, "Me" is. */
    const talkSection = document.getElementById("talk");
    const navLinks = document.querySelectorAll("[data-nav]");

    if (talkSection && navLinks.length && canObserve) {
        new IntersectionObserver((entries) => {
            const entry = entries[0];
            const current = entry.isIntersecting || entry.boundingClientRect.top < 0 ? "talk" : "me";
            navLinks.forEach((link) => {
                if (link.dataset.nav === current) link.setAttribute("aria-current", "true");
                else link.removeAttribute("aria-current");
            });
        }, { rootMargin: "-50% 0px -50% 0px" }).observe(talkSection);
    }

    /* ---- Copy-to-clipboard -------------------------------------------------
       <button data-copy="text"> with .copy-btn__idle / .copy-btn__done spans;
       CSS swaps them while data-copied is set. */
    document.querySelectorAll("[data-copy]").forEach((button) => {
        button.addEventListener("click", () => {
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(button.dataset.copy).then(() => {
                button.dataset.copied = "true";
                setTimeout(() => { delete button.dataset.copied; }, 1800);
            }, () => { /* blocked; the mailto button beside it still works */ });
        });
    });

    /* ---- Demo video dialog -------------------------------------------------
       [data-demo-open] is a plain link to the video file, so it works without
       JS. With JS it opens the <dialog> instead and plays at 1.5x. */
    const demo = document.querySelector("[data-demo]");
    const demoOpen = document.querySelector("[data-demo-open]");

    if (demo && demoOpen && demo.showModal) {
        const video = demo.querySelector("video");
        demoOpen.addEventListener("click", (event) => {
            event.preventDefault();
            demo.showModal();
            video.defaultPlaybackRate = 1.5;
            video.playbackRate = 1.5;
            video.play().catch(() => { /* autoplay refused; controls are there */ });
        });
        demo.addEventListener("close", () => video.pause());
        demo.addEventListener("click", (event) => {
            if (event.target === demo) demo.close();     /* click on the backdrop */
        });
    }

    /* ---- Talk to me --------------------------------------------------------
       State lives in data-state on [data-chat]:
         idle -> loading -> ready <-> busy      (error and unsupported are ends)
       The model is only downloaded after the visitor presses the start button.

       What keeps it quick and alive on ordinary laptops:
         1. It runs in a worker (llm-worker.js), so the page never freezes.
         2. Each question is a tiny, fresh prompt (a few notes plus the
            question), so there is almost nothing to read before answering.
         3. warmUp() runs one throwaway answer while the visitor is waiting
            anyway, so the first real one is not slow.
         4. If the GPU drops the model, revive() reloads it and asks again.
         5. A question typed while it is still waking is held and answered
            the moment it is ready. */
    const chat = document.querySelector("[data-chat]");
    if (!chat) return;

    const ui = {
        log: chat.querySelector("[data-chat-log]"),
        status: chat.querySelector("[data-chat-status]"),
        gate: chat.querySelector("[data-chat-gate]"),
        start: chat.querySelector("[data-chat-start]"),
        hint: chat.querySelector("[data-chat-hint]"),
        progress: chat.querySelector("[data-chat-progress]"),
        chips: chat.querySelector("[data-chat-chips]"),
        form: chat.querySelector("[data-chat-form]"),
        input: chat.querySelector("[data-chat-input]"),
    };

    const requested = new URLSearchParams(location.search).get("model");
    const modelId = requested || MODEL.id;
    const custom = !requested && MODEL.weights && MODEL.base;

    const SYSTEM = { role: "system", content: PERSONA };
    const MAX_TOKENS = 90;        /* one or two short sentences */

    let webllm = null;
    let engine = null;
    let queued = null;            /* a question typed while the model was still waking */
    let lastNotes = [];           /* so a follow-up ("who supervised it?") keeps its topic */

    const setState = (state, label) => {
        chat.dataset.state = state;
        ui.status.textContent = label;
    };

    const addMessage = (kind, text) => {
        const bubble = document.createElement("p");
        bubble.className = "msg msg--" + kind;
        bubble.textContent = text;
        ui.log.appendChild(bubble);
        ui.log.scrollTop = ui.log.scrollHeight;
        return bubble;
    };

    const giveUp = (state, label, message) => {
        if (queued) {
            queued.bubble.className = "msg msg--error";
            queued.bubble.textContent = "I could not wake up to answer that. Email me: " + EMAIL;
            queued = null;
        }
        setState(state, label);
        ui.gate.hidden = false;
        ui.chips.hidden = true;
        ui.form.hidden = true;
        ui.start.hidden = state === "unsupported";
        ui.start.disabled = false;
        ui.start.textContent = "Try again";
        ui.progress.hidden = true;
        ui.hint.textContent = message;
    };

    const NO_WEBGPU = "This browser cannot run the model. It needs WebGPU: try Chrome or Edge on a computer. Or email me: " + EMAIL;

    let remembered = false;
    try { remembered = localStorage.getItem("hma-model") === modelId; } catch (e) { /* private mode */ }

    if (!navigator.gpu) {
        giveUp("unsupported", "Unavailable", NO_WEBGPU);
        return;
    }

    const size = MODEL.sizeMB >= 1000 ? (MODEL.sizeMB / 1000).toFixed(1) + " GB" : MODEL.sizeMB + " MB";
    ui.hint.textContent = remembered
        ? "Already downloaded. It wakes in a few seconds."
        : "Downloads a " + (requested ? "" : size + " ") + "model to your browser. One time.";

    /* In a worker when the browser allows it; on the main thread otherwise. */
    const createEngine = async (options) => {
        let worker = null;
        try {
            worker = new Worker(WORKER_URL, { type: "module" });
            const crashed = new Promise((resolve, reject) => {
                worker.onerror = () => reject(new Error("The model worker could not start."));
            });
            return await Promise.race([webllm.CreateWebWorkerMLCEngine(worker, modelId, options), crashed]);
        } catch (error) {
            console.warn(error);
            if (worker) worker.terminate();
            return webllm.CreateMLCEngine(modelId, options);
        }
    };

    /* One throwaway answer, so the GPU has compiled everything before the
       visitor's first real question. */
    const warmUp = async () => {
        await engine.chat.completions.create({
            messages: [SYSTEM, { role: "user", content: "NOTES\n- Htet says hi.\n\nQUESTION\nSay hi." }],
            temperature: 0,
            max_tokens: 8,
        });
    };

    const showReady = () => {
        setState("ready", "Awake");
        ui.gate.hidden = true;
        ui.chips.hidden = false;
        ui.form.hidden = false;
    };

    const load = async () => {
        if (engine || chat.dataset.state === "loading") return;
        setState("loading", "Waking up");
        ui.start.disabled = true;
        ui.progress.hidden = false;
        ui.hint.textContent = "Waking up. You can type your first question now.";
        ui.chips.hidden = false;        /* the visitor can ask while it loads; see ask() */
        ui.form.hidden = false;
        setInputs(true);
        ui.input.focus({ preventScroll: true });

        try {
            if (!(await navigator.gpu.requestAdapter())) {
                giveUp("unsupported", "Unavailable", NO_WEBGPU);
                return;
            }

            webllm = await import(WEBLLM_URL);
            const options = {
                initProgressCallback: (report) => {
                    const percent = Math.round((report.progress || 0) * 100);
                    ui.progress.firstElementChild.style.width = percent + "%";
                    setState("loading", percent < 100 ? "Loading " + percent + "%" : "Warming up");
                },
            };

            if (custom) {
                /* The fine-tune reuses the runtime (.wasm) of the model it was trained from. */
                const base = webllm.prebuiltAppConfig.model_list.find((m) => m.model_id === MODEL.base);
                if (!base) throw new Error("Unknown base model: " + MODEL.base);
                options.appConfig = {
                    model_list: [{ model: MODEL.weights, model_id: MODEL.id, model_lib: base.model_lib, overrides: base.overrides }],
                };
            }

            const created = await createEngine(options);
            engine = created;
            setState("loading", "Warming up");
            await warmUp();
            try { localStorage.setItem("hma-model", modelId); } catch (e) { /* private mode */ }

            showReady();
            if (queued) {
                const { question, bubble } = queued;
                queued = null;
                respond(question, bubble);
            } else {
                ui.input.focus({ preventScroll: true });
            }
        } catch (error) {
            console.error(error);
            engine = null;
            /* A dropped download is not the device's fault, and trying again resumes it. */
            const interrupted = /network|fetch|cache|quota/i.test(String(error && error.name) + " " + String(error && error.message));
            giveUp("error", "Failed", interrupted
                ? "The download was interrupted. Check your connection and try again. Or email me: " + EMAIL
                : "The model could not start on this device. Email me instead: " + EMAIL);
        }
    };

    /* The GPU can drop the model mid-chat (low memory, driver reset). The
       weights are already cached, so reloading takes seconds, not a download. */
    const revive = async () => {
        setState("busy", "Restarting");
        await engine.reload(modelId);
        await warmUp();
    };

    const setInputs = (enabled) => {
        ui.input.disabled = !enabled;
        ui.chips.querySelectorAll("button").forEach((chip) => { chip.disabled = !enabled; });
    };

    const setBusy = (busy) => {
        setState(busy ? "busy" : "ready", busy ? "Thinking" : "Awake");
        setInputs(!busy);
    };

    /* Write the finished answer into its bubble as if typed. Driven by the clock,
       not by screen repaints, so it always finishes: in a background tab, and
       after a GPU crash, repaints stop but timers do not. */
    const TYPING_SPEED = 0.2;     /* characters per millisecond */
    const typeOut = (bubble, text) => new Promise((resolve) => {
        const started = performance.now();
        const step = () => {
            const shown = reducedMotion || document.hidden
                ? text.length
                : Math.min(text.length, Math.ceil((performance.now() - started) * TYPING_SPEED));
            bubble.textContent = text.slice(0, shown);
            ui.log.scrollTop = ui.log.scrollHeight;
            if (shown < text.length) setTimeout(step, 16);
            else resolve();
        };
        step();
    });

    /* Steps 1 to 4 of "How an answer is made", above. */
    const answer = async (question, bubble) => {
        let notes = notesFor(question);
        const followUp = !notes.length && lastNotes.length && /\b(it|that|this|there|those|them)\b/i.test(question);
        if (followUp) notes = lastNotes;

        if (!notes.length) {                    /* nothing on the page: do not ask the model */
            await typeOut(bubble, NOT_ON_PAGE);
            return;
        }
        lastNotes = notes;

        /* Not streamed: nothing is shown until it has passed the check. */
        const reply = await engine.chat.completions.create({
            messages: [SYSTEM, { role: "user", content: "NOTES\n" + notesText(notes) + "\n\nQUESTION\n" + question }],
            temperature: 0,
            max_tokens: MAX_TOKENS,
        });

        const text = (reply.choices[0].message.content || "").replace(/\*\*|`/g, "").trim();
        if (!text) throw new Error("The model returned nothing.");
        const passed = supported(text, notes);
        chat.last = { question, notes: notesText(notes), draft: text, passed };      /* for debugging */
        await typeOut(bubble, passed ? text : quote(notes));
    };

    /* Answer into an existing bubble. Reloads the model once if it has died. */
    const respond = async (question, bubble) => {
        setBusy(true);
        try {
            await answer(question, bubble);
        } catch (firstError) {
            console.warn(firstError);
            try {
                bubble.textContent = "";
                await revive();
                setBusy(true);
                await answer(question, bubble);
            } catch (secondError) {
                console.error(secondError);
                bubble.className = "msg msg--error";
                bubble.textContent = "That did not work. Ask again, or email me: " + EMAIL;
            }
        }

        bubble.classList.remove("msg--typing");
        setBusy(false);
        ui.input.focus({ preventScroll: true });
    };

    const ask = (question) => {
        question = question.trim();
        const state = chat.dataset.state;
        if (!question || (state !== "ready" && state !== "loading") || queued) return;

        addMessage("user", question);
        const bubble = addMessage("bot msg--typing", "");

        if (state === "loading") {
            /* Still waking: hold the question. load() answers it when ready. */
            queued = { question, bubble };
            setInputs(false);
            return;
        }
        respond(question, bubble);
    };

    ui.start.addEventListener("click", load);

    ui.form.addEventListener("submit", (event) => {
        event.preventDefault();
        const question = ui.input.value;
        ui.input.value = "";
        ask(question);
    });

    ui.chips.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-chat-ask]");
        if (chip) ask(chip.dataset.chatAsk);
    });

    /* For checking from the console, and for finetune/ (see CLAUDE.md):
         const chat = document.querySelector("[data-chat]")
         chat.persona              what the model is always told
         chat.facts                every topic and line it can be handed
         chat.notesFor("...")      the notes one question would get
         chat.last                 the last question, its notes, the model's draft, and whether it passed */
    chat.persona = PERSONA;
    chat.facts = notesText(TOPICS);
    chat.notesFor = (question) => notesText(notesFor(question));
    chat.supported = (text, question) => supported(text, notesFor(question));
})();
