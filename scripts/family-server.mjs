/**
 * Family static server: one origin, path per instrument.
 *
 * Serves apps/drumhaus/dist at / and apps/pulse/dist at /pulse/, each with an
 * SPA fallback to its own index.html. This mirrors the production deployment
 * plan (issue #414): BroadcastChannel and Web Locks - everything @haus/bridge
 * is built on - are same-origin only, so proving cross-app session sync
 * requires every instrument on one host. Node built-ins only, zero deps.
 *
 * Assumes both dists exist; `pnpm test:e2e:family` builds them first.
 */

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 4446);

const repoRoot = resolve(fileURLToPath(import.meta.url), "../..");
const drumhausDist = join(repoRoot, "apps/drumhaus/dist");
const pulseDist = join(repoRoot, "apps/pulse/dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
};

/** Route a pathname to an instrument's dist and the path within it. */
function route(pathname) {
  if (pathname === "/pulse" || pathname.startsWith("/pulse/")) {
    return { dist: pulseDist, rel: pathname.slice("/pulse".length) || "/" };
  }
  return { dist: drumhausDist, rel: pathname };
}

async function handle(req, res) {
  const pathname = decodeURIComponent(
    new URL(req.url ?? "/", "http://localhost").pathname,
  );
  const { dist, rel } = route(pathname);

  const target = normalize(join(dist, rel));
  if (target !== dist && !target.startsWith(dist + sep)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  let file = rel === "/" ? join(dist, "index.html") : target;
  let body;
  try {
    body = await readFile(file);
  } catch {
    // SPA fallback: anything unresolvable serves the instrument's index.html.
    file = join(dist, "index.html");
    body = await readFile(file);
  }
  res.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
  });
  res.end(body);
}

createServer((req, res) => {
  handle(req, res).catch((error) => {
    res.writeHead(500);
    res.end(String(error));
  });
}).listen(PORT, () => {
  console.log(`family server on http://localhost:${PORT}`);
  console.log(`  /       -> ${drumhausDist}`);
  console.log(`  /pulse/ -> ${pulseDist}`);
});
