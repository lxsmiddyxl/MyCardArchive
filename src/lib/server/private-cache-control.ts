import "server-only";

/** Short private cache for authenticated high-frequency JSON reads (browser only; not CDN). */
export const PRIVATE_SHORT_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
} as const;
