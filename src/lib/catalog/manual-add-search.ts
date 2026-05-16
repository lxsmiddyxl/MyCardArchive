import {
  buildCatalogSearchUrlForMode,
  parseCatalogSearchResults,
} from "@/lib/catalog/search";
import type { CatalogSearchMode } from "@/lib/catalog/search-modes";
import type { CatalogCardHit } from "@/lib/dto/catalog";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import {
  catalogSearchCacheKey,
  readCachedCatalogSearch,
  writeCachedCatalogSearch,
} from "@/mca-utils/offline/catalog-search-cache";

export async function fetchCatalogSearchWithCache(input: {
  query: string;
  mode: CatalogSearchMode;
  setId?: string;
  limit: number;
  offline: boolean;
}): Promise<{
  hits: CatalogCardHit[];
  set_id?: string | null;
  unique?: boolean;
  fromCache: boolean;
  error: string | null;
}> {
  const cacheKey = catalogSearchCacheKey(input.query, input.mode, input.setId);

  if (input.offline) {
    const cached = await readCachedCatalogSearch(cacheKey);
    if (cached) {
      return {
        hits: parseCatalogSearchResults({ results: cached.results }, input.limit),
        fromCache: true,
        error: null,
      };
    }
    return { hits: [], fromCache: true, error: "Offline — no cached results for this search." };
  }

  const url = buildCatalogSearchUrlForMode(input.mode, input.query, {
    setId: input.mode === "name" ? input.setId : undefined,
    limit: input.limit,
  });

  const r = await fetchJson<{
    results: CatalogCardHit[];
    unique?: boolean;
    set_id?: string | null;
  }>(url, { cache: "no-store" });

  if (r.kind !== "ok") {
    const cached = await readCachedCatalogSearch(cacheKey);
    if (cached) {
      return {
        hits: parseCatalogSearchResults({ results: cached.results }, input.limit),
        fromCache: true,
        error: null,
      };
    }
    return { hits: [], fromCache: false, error: fetchJsonErrorMessage(r) };
  }

  const hits = parseCatalogSearchResults(r.data, input.limit);
  void writeCachedCatalogSearch({
    cacheKey,
    query: input.query,
    mode: input.mode,
    results: hits,
    cachedAt: Date.now(),
  });

  return {
    hits,
    set_id: r.data.set_id,
    unique: r.data.unique,
    fromCache: false,
    error: null,
  };
}
