/**
 * Last-known-good JSON snapshots in sessionStorage (per-tab).
 * Used when the network fails but a prior successful load exists.
 */

export const LKG_KEY = {
  matching: "mca:lkg:matching:v1",
  deckCards: (deckId: string) => `mca:lkg:deck-cards:${deckId}`,
  /** Binder slot grid from last successful `/slots/list` load. */
  binderSlots: (binderId: string) => `mca:lkg:binder-slots:${binderId}`,
  scanLast: "mca:lkg:scan:last:v1",
  /** Last successful `/api/feed` payload (Phase 84 offline-first feed). */
  feed: "mca:lkg:feed:v1",
} as const;

export function lkgSet(key: string, value: unknown): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function lkgGet<T>(key: string): T | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function lkgRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* */
  }
}
