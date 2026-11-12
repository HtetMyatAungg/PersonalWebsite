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

       `id` is a model from WebLLM's built-in list. To switch to the model
       fine-tuned on Htet (see CLAUDE.md, "Swapping in the fine-tuned model"):
         weights: URL of the Hugging Face repo holding the MLC-converted weights
         base:    WebLLM id of the stock model it was fine-tuned from
         id:      any unique name for it, e.g. "htet-qwen2.5-1.5b"
       Leave `weights` null to use the stock model.

       To try another model without editing this file: /?model=<WebLLM id>#talk
       ====================================================================== */
    const MODEL = {
        id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        sizeMB: 1000,
        weights: null,
        base: null,
    };

    const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.88/+esm";

    /* What the model is told before every conversation. The FACTS are read off
       the page itself (every [data-facts] block), so the page is the single
       source of truth: edit the HTML and the model's knowledge follows. */
    const PERSONA = [
        "You are the AI version of Htet Myat Aung, answering visitors on his personal website.",
        "Most visitors are recruiters or researchers deciding whether to hire him.",
        "Speak as Htet, in the first person (\"I built...\"). Be friendly, direct and confident.",
        "",
        "Rules:",
        "1. Use only the FACTS below. Never invent employers, numbers, dates, skills or opinions.",
        "2. If the FACTS do not answer the question, say you do not have that detail here and give this email: " + EMAIL,
        "3. Keep answers short: one to three short sentences. Plain text only, no lists, no markdown.",
        "4. If asked about anything unrelated to Htet or his work, say you only talk about Htet and his work.",
    ].join("\n");

    /* ---- Facts: read the page into plain text ----------------------------
       Runs first, before the count-up animation rewrites any numbers.
       Links, buttons, images and decorative (aria-hidden) nodes are skipped. */
    const FACTS = (function readFacts() {
        const SKIP = 'a, button, nav, svg, img, video, script, [aria-hidden="true"]';
        const BLOCK = /^(P|H1|H2|H3|DIV|SECTION|ARTICLE|UL|OL|DL)$/;
        const lines = [];
        let line = "";

        const flush = () => {
            const text = line.replace(/\s+/g, " ").trim().replace(/,$/, "");
            if (text) lines.push(text);
            line = "";
        };

        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) { line += node.nodeValue; return; }
            if (node.nodeType !== Node.ELEMENT_NODE || node.matches(SKIP)) return;

            const tag = node.tagName;
            const block = BLOCK.test(tag);
            if (block || tag === "DT") flush();
            if (tag === "H2") line += "## ";
            if (tag === "H3") line += "### ";
            node.childNodes.forEach(walk);
            if (tag === "DT") line += ": ";          /* "100%: Pass rate on ..." */
            if (tag === "LI") {                       /* a list reads as one line: "PyTorch, XGBoost, ..." */
                line = line.trimEnd();
                if (line) line += /[.!?:]$/.test(line) ? " " : ", ";
            }
            if (block || tag === "DD") flush();
        };

        document.querySelectorAll("[data-facts]").forEach(walk);
        return lines.join("\n");
    })();

    /* Exactly what the model is given before the visitor's first question. */
    const SYSTEM_PROMPT = PERSONA + "\n\nFACTS\n" + FACTS;

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
       The model is only downloaded after the visitor presses the start button. */
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
    const HISTORY_TURNS = 6;      /* messages kept as context, newest last */

    let engine = null;
    const history = [];

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
        setState(state, label);
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

    const load = async () => {
        if (engine || chat.dataset.state === "loading") return;
        setState("loading", "Waking up");
        ui.start.disabled = true;
        ui.progress.hidden = false;

        try {
            if (!(await navigator.gpu.requestAdapter())) {
                giveUp("unsupported", "Unavailable", NO_WEBGPU);
                return;
            }

            const webllm = await import(WEBLLM_URL);
            const options = {
                initProgressCallback: (report) => {
                    const percent = Math.round((report.progress || 0) * 100);
                    ui.progress.firstElementChild.style.width = percent + "%";
                    setState("loading", percent < 100 ? "Loading " + percent + "%" : "Starting");
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

            engine = await webllm.CreateMLCEngine(modelId, options);
            try { localStorage.setItem("hma-model", modelId); } catch (e) { /* private mode */ }

            setState("ready", "Awake");
            ui.gate.hidden = true;
            ui.chips.hidden = false;
            ui.form.hidden = false;
            ui.input.focus({ preventScroll: true });
        } catch (error) {
            console.error(error);
            giveUp("error", "Failed", "The model could not start on this device. Email me instead: " + EMAIL);
        }
    };

    const setBusy = (busy) => {
        setState(busy ? "busy" : "ready", busy ? "Thinking" : "Awake");
        ui.input.disabled = busy;
        ui.chips.querySelectorAll("button").forEach((chip) => { chip.disabled = busy; });
    };

    const ask = async (question) => {
        question = question.trim();
        if (!question || !engine || chat.dataset.state !== "ready") return;

        setBusy(true);
        addMessage("user", question);
        history.push({ role: "user", content: question });
        const bubble = addMessage("bot msg--typing", "");
        let answer = "";

        try {
            const stream = await engine.chat.completions.create({
                messages: [{ role: "system", content: SYSTEM_PROMPT }].concat(history.slice(-HISTORY_TURNS)),
                stream: true,
                temperature: 0.2,
                max_tokens: 200,
            });

            for await (const chunk of stream) {
                answer += (chunk.choices[0] && chunk.choices[0].delta.content) || "";
                bubble.textContent = answer.replace(/\*\*|`/g, "");     /* small models love markdown */
                ui.log.scrollTop = ui.log.scrollHeight;
            }
            history.push({ role: "assistant", content: answer });
        } catch (error) {
            console.error(error);
            history.pop();
            bubble.className = "msg msg--error";
            bubble.textContent = "That did not work. Ask again, or email me: " + EMAIL;
        }

        bubble.classList.remove("msg--typing");
        setBusy(false);
        ui.input.focus({ preventScroll: true });
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

    /* For checking from the console: document.querySelector("[data-chat]").systemPrompt */
    chat.systemPrompt = SYSTEM_PROMPT;
})();
