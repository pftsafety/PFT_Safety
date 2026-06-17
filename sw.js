// Portal PWA Service Worker v5
const CACHE = "portal-v5";

self.addEventListener("install", e => {
  self.skipWaiting();
  // Don't pre-cache anything — avoid fetch errors during install
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log("SW: deleting old cache", k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // Never intercept Apps Script API calls
  if (url.hostname.includes("script.google.com")) return;

  // Never intercept chrome-extension or non-http requests
  if (!url.protocol.startsWith("http")) return;

  // For navigation requests (page loads) — network first, fallback to cache
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // For everything else — network first, cache fallback
  e.respondWith(
    fetch(req)
      .then(res => {
        // Only cache successful same-origin responses
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
