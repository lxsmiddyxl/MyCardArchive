/** Thresholds aligned with `refresh_user_trade_reputation` in migration 079. */

export type TradeReputationCounts = {
  completedTradesCount: number;
  positiveFeedbackCount: number;
  neutralFeedbackCount: number;
  negativeFeedbackCount: number;
  lastTradeAt: string | null;
};

export function positiveRatioFromCounts(row: TradeReputationCounts | null | undefined): number {
  const n = row?.completedTradesCount ?? 0;
  if (n <= 0) return 0;
  return (row?.positiveFeedbackCount ?? 0) / n;
}

export function hasTrustedTraderStatus(row: TradeReputationCounts | null | undefined): boolean {
  const n = row?.completedTradesCount ?? 0;
  return n >= 10 && positiveRatioFromCounts(row) >= 0.85;
}

export function hasVeteranTraderStatus(row: TradeReputationCounts | null | undefined): boolean {
  return (row?.completedTradesCount ?? 0) >= 50;
}

export function hasReliableShopStatus(
  row: TradeReputationCounts | null | undefined,
  tierSlug: string | null | undefined
): boolean {
  const t = (tierSlug ?? "").trim().toLowerCase();
  const n = row?.completedTradesCount ?? 0;
  return t === "business" && n >= 20 && positiveRatioFromCounts(row) >= 0.9;
}

/** Display order: shop > veteran > trusted (matches badge prestige). */
export type TopTradeBadgeKey = "reliable_shop" | "veteran_trader" | "trusted_trader";

export function pickTopTradeBadgeKey(
  row: TradeReputationCounts | null | undefined,
  tierSlug: string | null | undefined
): TopTradeBadgeKey | null {
  if (!row || (row.completedTradesCount ?? 0) <= 0) return null;
  if (hasReliableShopStatus(row, tierSlug)) return "reliable_shop";
  if (hasVeteranTraderStatus(row)) return "veteran_trader";
  if (hasTrustedTraderStatus(row)) return "trusted_trader";
  return null;
}

export function buildTradeReputationScoreSummary(row: TradeReputationCounts | null | undefined): string | null {
  const n = row?.completedTradesCount ?? 0;
  if (n <= 0) return null;
  const pct = Math.round(positiveRatioFromCounts(row) * 100);
  return `${n} trade${n === 1 ? "" : "s"}, ${pct}% positive`;
}

export function tradeReputationFlairKeysFromContext(
  row: TradeReputationCounts | null | undefined,
  tierSlug: string | null | undefined
): string[] {
  const keys: string[] = [];
  if (hasReliableShopStatus(row, tierSlug)) keys.push("trade_reliable_shop");
  if (hasVeteranTraderStatus(row)) keys.push("trade_veteran_trader");
  if (hasTrustedTraderStatus(row)) keys.push("trade_trusted_trader");
  return keys;
}
