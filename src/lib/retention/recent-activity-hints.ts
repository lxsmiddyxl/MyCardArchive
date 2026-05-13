import type { LastSurfaces } from "@/lib/retention/last-surface-memory";

export type RetentionHints = {
  draftTradeNudge: boolean;
  last: LastSurfaces;
};

/** Pure helper for UI copy (Phase 62). */
export function retentionSummary(hints: RetentionHints): string | null {
  if (hints.draftTradeNudge) {
    return "You have a trade draft in progress — pick it up on Trades.";
  }
  if (hints.last.binderId || hints.last.deckId) {
    return "Jump back to your last binder or deck from the shortcuts below.";
  }
  return null;
}
