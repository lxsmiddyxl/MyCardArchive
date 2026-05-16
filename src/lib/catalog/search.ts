import type { CatalogCardHit } from "@/lib/dto/catalog";
import type { CatalogSearchMode } from "@/lib/catalog/search-modes";
import {
  buildNumberSearchUrl,
  buildSetSearchUrl,
} from "@/lib/catalog/search-modes";

export const CATALOG_AUTOCOMPLETE_DEBOUNCE_MS = 200;
export const CATALOG_AUTOCOMPLETE_LIMIT = 10;
export const CATALOG_SET_SEARCH_LIMIT = 50;

/** Build catalog search URL (`query` alias supported server-side). */
export function buildCatalogSearchUrl(
  query: string,
  opts?: { setId?: string; limit?: number }
): string {
  const q = query.trim();
  const sp = new URLSearchParams({ query: q, limit: String(opts?.limit ?? CATALOG_AUTOCOMPLETE_LIMIT) });
  if (opts?.setId?.trim()) {
    sp.set("set_id", opts.setId.trim());
  }
  return `/api/catalog/search?${sp.toString()}`;
}

export function buildCatalogSearchUrlForMode(
  mode: CatalogSearchMode,
  query: string,
  opts?: { setId?: string; limit?: number }
): string {
  const q = query.trim();
  if (mode === "set") {
    return buildSetSearchUrl(q);
  }
  if (mode === "number") {
    return buildNumberSearchUrl(q);
  }
  return buildCatalogSearchUrl(q, opts);
}

export function normalizeCatalogSearchHit(row: Record<string, unknown>): CatalogCardHit | null {
  const id = typeof row.id === "string" ? row.id : "";
  const name = typeof row.name === "string" ? row.name : "";
  if (!id || !name) return null;
  const set =
    typeof row.set === "string"
      ? row.set
      : typeof row.set_name === "string"
        ? row.set_name
        : "";
  const subtypesRaw = row.subtypes;
  const subtypes = Array.isArray(subtypesRaw)
    ? subtypesRaw.filter((s): s is string => typeof s === "string")
    : [];
  return {
    id,
    name,
    set,
    set_id: typeof row.set_id === "string" ? row.set_id : undefined,
    number: typeof row.number === "string" ? row.number : "",
    rarity: typeof row.rarity === "string" ? row.rarity : null,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    supertype: typeof row.supertype === "string" ? row.supertype : null,
    subtypes,
    tcgplayer_id: typeof row.tcgplayer_id === "string" ? row.tcgplayer_id : id,
  };
}

export function parseCatalogSearchResults(
  payload: unknown,
  max = CATALOG_AUTOCOMPLETE_LIMIT
): CatalogCardHit[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const out: CatalogCardHit[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const hit = normalizeCatalogSearchHit(row as Record<string, unknown>);
    if (hit) out.push(hit);
  }
  return out.slice(0, max);
}
