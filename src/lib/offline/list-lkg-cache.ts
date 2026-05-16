/** Phase 89 — improved offline list caching for mobile surfaces. */

export const LIST_LKG_KEYS = {
  feed: "mca:lkg:feed:v1",
  binders: "mca:lkg:binders:v1",
  decks: "mca:lkg:decks:v1",
  marketOffers: "mca:lkg:market-offers:v1",
} as const;

export type ListLkgEntry<T> = {
  savedAt: string;
  items: T[];
};

export function readListLkg<T>(key: string): ListLkgEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ListLkgEntry<T>;
  } catch {
    return null;
  }
}

export function writeListLkg<T>(key: string, items: T[], maxItems = 48): void {
  if (typeof window === "undefined") return;
  try {
    const entry: ListLkgEntry<T> = {
      savedAt: new Date().toISOString(),
      items: items.slice(0, maxItems),
    };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function clearListLkg(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
