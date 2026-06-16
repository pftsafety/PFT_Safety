// ── Service Worker for My Portal PWA ──────────────────────────
// Uses relative URLs so it works under any GitHub Pages subpath
// e.g. https://user.github.io/repo-name/

const CACHE = "portal-v2";

// Derive the base path from the SW's own location
const BASE = self.location.pathname.replace(/\/sw\.js$/, "") || "";

const STATIC = [
  BASE + "/",
  BASE + "/index.html",
  BASE + "/manifest.json",
  BASE + "/icon-192.png",
  BASE + "/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => {
        // Cache each URL individually so one failure doesn't break all
        return Promise.allSettled(STATIC.map(url => c.add(url)));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Always pass through — Apps Script API calls (POST + cross-origin)
  if (e.request.method !== "GET") return;
  if (url.hostname.includes("script.google.com")) return;

  // Google Fonts — cache-first
  if (url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Same-origin requests: network-first, fallback to cache, then index.html
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request)
          .then(cached => cached || caches.match(BASE + "/index.html"))
      )
  );
});
