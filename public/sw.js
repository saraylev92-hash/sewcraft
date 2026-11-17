// SewCraft offline support: network-first for pages, cache-first for static assets.
const PAGES = "sewcraft-pages-v1";
const ASSETS = "sewcraft-assets-v1";
const BASE = new URL(self.registration.scope).pathname; // "/" or "/sewcraft/" on GitHub Pages
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (url.pathname.startsWith(BASE + "_next/static/")) {
    e.respondWith(caches.open(ASSETS).then(async (c) => (await c.match(req)) || fetch(req).then((r) => (c.put(req, r.clone()), r))));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const copy = r.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); return r; })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match(BASE)) || Response.error()),
    );
  }
});
