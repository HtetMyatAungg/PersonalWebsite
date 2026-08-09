/**
 * serve.mjs — a static file server for local previewing.
 *
 *     npm run dev
 *
 * The blog loads posts with fetch(), which browsers refuse to do over file://,
 * so opening index.html by double-clicking leaves the blog empty. This serves
 * the folder over HTTP instead. Zero dependencies, deliberately.
 *
 * This is a development convenience only — GitHub Pages serves the real site.
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8000;

const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".ico": "image/x-icon",
};

function resolve(urlPath) {
    const decoded = decodeURIComponent(urlPath.split("?")[0]);
    /* normalize() collapses "..", so a request can never escape ROOT. */
    const relative = normalize(decoded).replace(/^([/\\])+/, "");
    const target = join(ROOT, relative || "index.html");

    try {
        return statSync(target).isDirectory() ? join(target, "index.html") : target;
    } catch {
        return null;
    }
}

createServer((request, response) => {
    const file = resolve(request.url);

    if (!file) {
        response.writeHead(404, { "content-type": TYPES[".html"] });
        createReadStream(join(ROOT, "404.html")).pipe(response);
        return;
    }

    response.writeHead(200, {
        "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
        /* Never cache during development, or edits appear not to take. */
        "cache-control": "no-store",
    });
    createReadStream(file).pipe(response);
}).listen(PORT, () => {
    console.log(`\n  Serving ${ROOT}\n  http://localhost:${PORT}\n\n  Ctrl+C to stop.\n`);
});
