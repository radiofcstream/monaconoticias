const CACHE_NAME = "monaco-fm-static-v1";
const STATIC_FILES = ["/", "/manifest.webmanifest", "/monaco.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Never intercept/cache the live radio stream or API requests.
  if (url.origin !== self.location.origin ||
      url.pathname.startsWith("/radio/") ||
      url.pathname.startsWith("/api") ||
      event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () =>
        (await caches.match("/")) || Response.error()
      )
    );
  }
});
