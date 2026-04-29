import type { PriceData } from "@/lib/types/database";
import type { CardPriceLookup } from "./tcgplayer";

/**
 * Mock Cardmarket trend (EU). Replace with API integration later.
 * Never throws.
 */
export async function fetchCardmarketPrice(
  card: CardPriceLookup
): Promise<PriceData> {
  try {
    const eur = 8.2 + (card.name.length % 9) * 0.45;
    return {
      provider: "cardmarket",
      market_price: Math.round(eur * 100) / 100,
      currency: "EUR",
      raw: {
        mock: true,
        source: "cardmarket",
        trend_price_eur: eur,
      },
    };
  } catch {
    return {
      provider: "cardmarket",
      market_price: null,
      currency: "EUR",
      raw: { mock: true, error: "cardmarket_unavailable" },
    };
  }
}
