export {
  addTradeItem,
  addTradeMessage,
  createTradeDraft,
  getTradeById,
  getUserTrades,
  updateTradeStatus,
} from "@/lib/trading/db";
export type { TradeAction } from "@/lib/trading/validation";
import { validateDraftLines } from "@/lib/trading/validation";

export { validateDraftLines };
import type { TradeCardLine, TradeDraft, TradeSummaryStats } from "@/lib/trading/types";

/** Client-side empty draft for forms that build payloads manually */
export function createTradeDraftShape(): Pick<TradeDraft, "offerSideA" | "offerSideB"> {
  return { offerSideA: [], offerSideB: [] };
}

export function validateTrade(draft: TradeDraft): { ok: boolean; errors: string[] } {
  const offerLines = draft.offerSideA.map((l) => ({
    cardId: l.cardId,
    quantity: l.quantity ?? 1,
  }));
  const requestLines = draft.offerSideB.map((l) => ({
    cardId: l.cardId,
    quantity: l.quantity ?? 1,
  }));
  const v = validateDraftLines(offerLines, requestLines);
  if (!v.ok) return { ok: false, errors: [v.error] };
  if (!draft.counterpartyId?.trim()) {
    return { ok: false, errors: ["Choose a counterparty by user id."] };
  }
  return { ok: true, errors: [] };
}

export function computeTradeSummary(lines: TradeCardLine[]): TradeSummaryStats {
  const sets = new Set<string>();
  const rarityCounts: Record<string, number> = {};
  let totalCards = 0;
  for (const line of lines) {
    const q = line.quantity ?? 1;
    totalCards += q;
    if (line.setName) sets.add(line.setName);
    const r = line.rarity ?? "Unknown";
    rarityCounts[r] = (rarityCounts[r] ?? 0) + q;
  }
  return {
    totalCards,
    sets: Array.from(sets).sort((a, b) => a.localeCompare(b)),
    rarityCounts,
  };
}

export type {
  TradeCardLine,
  TradeDraft,
  TradeLineInput,
  TradeMessage,
  TradeRecord,
  TradeStatus,
  TradeSummaryStats,
} from "./types";
