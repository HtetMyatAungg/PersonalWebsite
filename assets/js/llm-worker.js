/*
 * llm-worker.js — runs the "Talk to me" model off the main thread, so the page
 * never freezes while the model loads or writes. Started by site.js; nothing
 * else uses it.
 *
 * Keep this WebLLM version identical to WEBLLM_URL in site.js.
 */
import { WebWorkerMLCEngineHandler } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.88/+esm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message) => handler.onmessage(message);
