/**
 * Phase 34: tiny in-memory stale-while-revalidate cache for list-shaped JSON fetches.
 * Not a full SWR client — avoids extra deps while improving repeat navigations.
 */

type Entry<T> = { value: T; storedAt: number };

const store = new Map<string, Entry<unknown>>();

export type SwrCacheOptions = {
  /** Serve cached value while younger than this (ms); then refresh in background if stale. */
  staleMs: number;
  /** Hard drop entries older than this (ms). */
  maxAgeMs: number;
};

const DEFAULTS: SwrCacheOptions = {
  staleMs: 20_000,
  maxAgeMs: 5 * 60_000,
};

export function readSwrCache<T>(key: string, maxAgeMs: number): T | undefined {
  const ent = store.get(key) as Entry<T> | undefined;
  if (!ent) return undefined;
  if (Date.now() - ent.storedAt > maxAgeMs) {
    store.delete(key);
    return undefined;
  }
  return ent.value;
}

export function writeSwrCache<T>(key: string, value: T): void {
  store.delete(key);
  store.set(key, { value, storedAt: Date.now() });
}

export function clearSwrCacheKey(key: string): void {
  store.delete(key);
}

/** For tests */
export function resetSwrCacheForTests(): void {
  store.clear();
}

/**
 * Returns cached data when fresh enough; when stale (but younger than maxAgeMs), returns cache
 * immediately and kicks off `fetcher` in the background to refresh the entry.
 */
export async function fetchStaleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: Partial<SwrCacheOptions>
): Promise<T> {
  const { staleMs, maxAgeMs } = { ...DEFAULTS, ...opts };
  const now = Date.now();
  const ent = store.get(key) as Entry<T> | undefined;

  if (ent && now - ent.storedAt <= maxAgeMs) {
    const age = now - ent.storedAt;
    if (age > staleMs) {
      void fetcher()
        .then((v) => {
          store.set(key, { value: v, storedAt: Date.now() });
        })
        .catch(() => {});
    }
    return ent.value;
  }

  const value = await fetcher();
  store.set(key, { value, storedAt: now });
  return value;
}
