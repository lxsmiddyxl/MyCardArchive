/* Phase 69: minimal service worker — lifecycle + optional offline shells. */
/** Offline shells — app shell routes (Phase 69 + 74). */
const SHELL = [
  "/feed",
  "/market",
  "/community",
  "/binders",
  "/decks",
  "/trades",
  "/mobile/sync",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open("mca-offline-v1").then(async (cache) => {
      for (const url of SHELL) {
        try {
          await cache.add(new Request(url, { cache: "reload" }));
        } catch {
          /* ignore per-route failures (e.g. dev) */
        }
      }
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const c = await caches.match(req);
        if (c) return c;
        return caches.match("/feed");
      })
    );
    return;
  }
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "mca-sync") {
    event.waitUntil(Promise.resolve());
  }
  if (event.tag === "mca-feed-market") {
    event.waitUntil(
      Promise.all([
        fetch("/api/feed?limit=12", { credentials: "same-origin" }).catch(() => null),
        fetch("/api/community/posts?limit=8", { credentials: "same-origin" }).catch(() => null),
      ])
    );
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "mca-push" }));
      return self.registration.showNotification("MyCardArchive", {
        body: "New activity — open the app to catch up.",
        icon: "/icon-192.png",
      });
    })
  );
});
