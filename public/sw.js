/* eslint-disable no-restricted-globals */
/**
 * HiFiGoods service worker — hand-rolled, no build-time dependency.
 *
 * Written by hand rather than generated (Serwist / next-pwa) on purpose: those
 * integrate through the webpack config, and a misconfigured precache manifest
 * fails at build time in ways that are painful to debug. This file is plain JS
 * served from /public, so it can be read, reasoned about and edited directly.
 *
 * ── Caching strategy ────────────────────────────────────────────────────────
 *  Static build output (/_next/static/*) → cache-first. Content-hashed, so it
 *      can never go stale.
 *  Icons and manifest              → cache-first.
 *  Page navigations                → network-first, falling back to the last
 *      good copy of that page, then to /offline.
 *  Everything else (API, Supabase) → straight to network. Never cached: it's
 *      authenticated data, and a stale ledger is worse than no ledger.
 *
 * ── Privacy ─────────────────────────────────────────────────────────────────
 *  Cached HTML contains the signed-in user's data. The app clears these caches
 *  on sign-out (see lib/offline/cache.ts) so a second account on the same
 *  device cannot see the first one's pages. POST/PUT/DELETE is never cached.
 */

// Bumped when route paths changed: v1 caches hold pages keyed by the old flat
// URLs (/parties, /routes …), which no longer exist. activate() deletes any
// hifigoods-* cache that isn't the current version, so the stale entries go.
const VERSION = "v2";
const STATIC_CACHE = `hifigoods-static-${VERSION}`;
const PAGES_CACHE = `hifigoods-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

/** Minimal shell so a cold offline start still renders something branded. */
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Individually, so one 404 can't fail the whole install.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("hifigoods-") &&
              k !== STATIC_CACHE &&
              k !== PAGES_CACHE,
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Sign-out purge — see lib/offline/cache.ts.
  if (data.type === "CLEAR_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith("hifigoods-")).map((k) => caches.delete(k)),
        );
      })(),
    );
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const response = await fetch(request);

    // Only store real, complete HTML for the URL that was asked for.
    //
    // `response.redirected` is the important guard: when a session expires the
    // middleware bounces /dashboard to /login, and the browser follows it
    // transparently. Caching that would store the login page *as* /dashboard,
    // so the next offline visit would show a login form forever.
    const cacheable =
      response &&
      response.ok &&
      !response.redirected &&
      response.type === "basic";

    if (cacheable) cache.put(request, response.clone());
    return response;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: false });
    if (hit) return hit;

    // Try the same page without its query string — a filtered list is better
    // than nothing when the exact URL was never visited online.
    const bare = new URL(request.url);
    bare.search = "";
    const bareHit = await cache.match(bare.toString());
    if (bareHit) return bareHit;

    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Writes are never intercepted. Offline writes are handled in the app by an
  // explicit IndexedDB queue, not by silently swallowing failed requests here.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Leave cross-origin alone — Supabase, fonts, everything else.
  if (url.origin !== self.location.origin) return;

  // Never cache auth callbacks or Server Action responses.
  if (url.pathname.startsWith("/auth/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});
