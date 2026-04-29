import type { PriceData } from "@/lib/types/database";

const PROVIDER_PRIORITY = ["tcgplayer", "ebay", "cardmarket"] as const;

/** Static mock rate for cross-currency hints (real FX later). */
const EUR_TO_USD = 1.08;

export function amountInUsd(amount: number, currency: string): number {
  const c = (currency ?? "USD").toUpperCase();
  if (c === "USD") return amount;
  if (c === "EUR") return amount * EUR_TO_USD;
  return amount;
}

export type NormalizedPriceSummary = {
  best_price: number | null;
  currency: string;
  providers: PriceData[];
};

/**
 * Picks best_price by provider priority: TCGplayer → eBay → Cardmarket.
 * Currency is taken from the winning provider row (USD/EUR normalized via `amountInUsd` at call sites if needed).
 * Never throws.
 */
export function normalizePriceData(
  list: PriceData[]
): NormalizedPriceSummary {
  try {
    const providers = Array.isArray(list)
      ? list.filter((p) => p && typeof p === "object")
      : [];

    for (const key of PROVIDER_PRIORITY) {
      const found = providers.find(
        (x) =>
          x.provider === key &&
          x.market_price != null &&
          !Number.isNaN(Number(x.market_price))
      );
      if (found) {
        const n = Number(found.market_price);
        const cur =
          typeof found.currency === "string" && found.currency
            ? found.currency
            : "USD";
        return {
          best_price: n,
          currency: cur,
          providers,
        };
      }
    }

    return {
      best_price: null,
      currency: "USD",
      providers,
    };
  } catch {
    return {
      best_price: null,
      currency: "USD",
      providers: [],
    };
  }
}
