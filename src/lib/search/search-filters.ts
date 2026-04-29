/**
 * Identity-driven collector search — filter shapes mirror `search_collectors` JSON (migration 089).
 */

/** Coarse value bucket (0–4). Not monetary advice. */
export type ValueBand = 0 | 1 | 2 | 3 | 4;

/** Trade reputation band (0–3). */
export type TradeTierBand = 0 | 1 | 2 | 3;

/** Indexed presence bucket (matches `user_search_index.presence_state`). */
export type SearchPresenceState = "online" | "recent" | "offline";

export type CollectorSearchFilters = {
  playFormatId?: string;
  playArchetypeId?: string;
  fandomEraId?: string;
  fandomSetId?: string;
  fandomArtistId?: string;
  fandomCharacterId?: string;
  fandomThemeId?: string;
  valueBandMin?: ValueBand;
  valueBandMax?: ValueBand;
  rarityProfile?: string;
  minBinderComplete?: number;
  minSetComplete?: number;
  completedJourneyIds?: string[];
  tradeTierMin?: TradeTierBand;
  tradeTierMax?: TradeTierBand;
  clubIds?: string[];
  /** Natural-language persona keyword search (server tsvector). */
  personaQuery?: string;
  presenceState?: SearchPresenceState;
  /** Match collectors whose last activity was within this many days (smaller = more recent). */
  activeWithinDaysMax?: number;
  seasonalEventIds?: string[];
  minEventsLast7Days?: number;
  minEventsLast30Days?: number;
};

const MULTISPACE = /\s+/g;

/** Normalize free-text for URLs and RPC payloads (trim, collapse spaces). */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(MULTISPACE, " ");
}

/** Split persona-like text into tokens for client-side preview only (server uses `to_tsvector`). */
export function tokenizePersona(text: string): string[] {
  const n = normalizeSearchQuery(text).toLowerCase();
  if (!n) return [];
  return n.split(/[^a-z0-9]+/i).filter((t) => t.length >= 2);
}

export function emptyFilters(): CollectorSearchFilters {
  return {};
}

/** Serialize filters for query string (JSON). Omits undefined / empty arrays. */
export function serializeFiltersForQuery(filters: CollectorSearchFilters): string {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    o[k] = v;
  }
  return JSON.stringify(o);
}

export function parseFiltersFromQuery(raw: string | null | undefined): CollectorSearchFilters {
  if (!raw?.trim()) return {};
  try {
    const x = JSON.parse(raw) as unknown;
    if (!x || typeof x !== "object" || Array.isArray(x)) return {};
    return x as CollectorSearchFilters;
  } catch {
    return {};
  }
}
