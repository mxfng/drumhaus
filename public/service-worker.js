/* Drumhaus basic service worker
 *
 * - Pre-caches a small app shell so the UI can load offline after first visit.
 * - Uses network-first for navigations with a cache fallback.
 * - Uses cache-first for static assets (scripts/styles/images/fonts) on same origin.
 *
 * This file is intentionally framework-agnostic so it can be reused in a future Vite build.
 */

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `drumhaus-shell-${CACHE_VERSION}`;

// Minimal set of URLs needed for the app shell; can be extended later if needed.
const APP_SHELL_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/opengraph-image.png",
  "/drumhaus.svg",
];

// Init preset and drumhaus kit samples (relative to /samples/)
const INIT_DRUMHAUS_SAMPLE_ASSETS = [
  "/samples/0/kick.wav",
  "/samples/0/kick2.wav",
  "/samples/0/snare.wav",
  "/samples/0/clap.wav",
  "/samples/0/hat.wav",
  "/samples/0/ohat.wav",
  "/samples/0/tom.wav",
  "/samples/0/tom2.wav",
];

// Optionally, waveform JSON for the drumhaus kit instruments
const INIT_DRUMHAUS_WAVEFORM_ASSETS = [
  "/waveforms/kick.json",
  "/waveforms/kick2.json",
  "/waveforms/snare.json",
  "/waveforms/clap.json",
  "/waveforms/hat.json",
  "/waveforms/ohat.json",
  "/waveforms/tom.json",
  "/waveforms/tom2.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) =>
        cache.addAll([
          ...APP_SHELL_ASSETS,
          ...INIT_DRUMHAUS_SAMPLE_ASSETS,
          ...INIT_DRUMHAUS_WAVEFORM_ASSETS,
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("drumhaus-shell-") && key !== APP_SHELL_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Network-first strategy for navigations (HTML documents)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // Cache-first for static assets from same origin
  if (
    url.origin === self.location.origin &&
    ["script", "style", "image", "font"].includes(request.destination)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          const copy = response.clone();
          caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
  }
});
