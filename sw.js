// Portal PWA Service Worker
// Automatically handles GitHub Pages subpath (e.g. /repo-name/)

const CACHE_NAME = "portal-cache-v3";

// Detect base path at install time from SW's own URL
const SW_URL   = self.location.href;
const BASE_PATH = SW_URL.substring(0, SW_URL.lastIndexOf("/") + 1);

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache using the full URL derived from SW location
      const urls = [
        BASE_PATH,
        BASE_PATH + "index.html",
        BASE_PATH + "manifest.json",
        BASE_PATH + "icon-192.png",
        BASE_PATH + "icon-512.png",
      ];
      return Promise.allSettled(
        urls.map(url =>
          fetch(url).then(res => {
            if (res.ok) cache.put(url, res);
          }).catch(() => {})
        )
      );
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET and cross-origin API calls
  if (req.method !== "GET") return;
  if (url.hostname.includes("script.google.com")) return;

  // Google Fonts — cache first
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Everything else — network first, fallback to cache, then serve index.html
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(cached => {
          if (cached) return cached;
          // Fallback: serve index.html for navigation requests
          if (req.mode === "navigate") {
            return caches.match(BASE_PATH + "index.html");
          }
        })
      )
  );
});
