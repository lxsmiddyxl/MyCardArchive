import { logClientCollectionFetchTiming } from "@/lib/client/dev-client-perf";

/**
 * Warm browser cache for common collection APIs after sign-in navigation (best-effort).
 */
const URLS = ["/api/binders", "/api/decks/list", "/api/trades/list"] as const;

export function scheduleCollectionListPrefetch(): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!navigator.onLine) return;

  const run = () => {
    for (const path of URLS) {
      const started = performance.now();
      void fetch(path, { credentials: "include", priority: "low" } as RequestInit)
        .then((res) => {
          logClientCollectionFetchTiming("prefetch", path, started, res.ok, res.status);
        })
        .catch(() => {
          logClientCollectionFetchTiming("prefetch", path, started, false);
        });
    }
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => run(), { timeout: 3500 });
  } else {
    setTimeout(run, 400);
  }
}
