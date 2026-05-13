/** Local keys for return-to-surface memory (Phase 62). */
export const LAST_BINDER_KEY = "mca:last:binderId";
export const LAST_DECK_KEY = "mca:last:deckId";
export const LAST_TRADE_DRAFT_KEY = "mca:last:tradeDraftHint";

export type LastSurfaces = {
  binderId: string | null;
  deckId: string | null;
};

export function parseLastSurfaces(raw: string | null): LastSurfaces {
  if (!raw) return { binderId: null, deckId: null };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const binderId = typeof o.binderId === "string" && o.binderId.length > 0 ? o.binderId : null;
    const deckId = typeof o.deckId === "string" && o.deckId.length > 0 ? o.deckId : null;
    return { binderId, deckId };
  } catch {
    return { binderId: null, deckId: null };
  }
}

export function serializeLastSurfaces(s: LastSurfaces): string {
  return JSON.stringify({ binderId: s.binderId, deckId: s.deckId });
}

/** Pure: merge binder/deck ids into stored JSON blob. */
export function mergeLastSurfacesJson(prevJson: string | null, patch: Partial<LastSurfaces>): string {
  const cur = parseLastSurfaces(prevJson);
  return serializeLastSurfaces({
    binderId: patch.binderId !== undefined ? patch.binderId : cur.binderId,
    deckId: patch.deckId !== undefined ? patch.deckId : cur.deckId,
  });
}
