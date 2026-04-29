import type { PriceData } from "@/lib/types/database";

export type CardPriceLookup = {
  name: string;
  number?: string | null;
  rarity?: string | null;
};

/**
 * Mock TCGplayer market price (US). Swap for Partner API / catalog search later.
 * Never throws.
 */
export async function fetchTcgplayerPrice(
  card: CardPriceLookup
): Promise<PriceData> {
  try {
    const base = 6.5 + (card.name.length % 12) * 0.35;
    const adj = card.rarity?.toLowerCase().includes("holo") ? 4 : 0;
    const price = Math.round((base + adj) * 100) / 100;
    return {
      provider: "tcgplayer",
      market_price: price,
      currency: "USD",
      raw: {
        mock: true,
        source: "tcgplayer",
        product_query: card.name,
        listing_hint: card.number ?? null,
      },
    };
  } catch {
    return {
      provider: "tcgplayer",
      market_price: null,
      currency: "USD",
      raw: { mock: true, error: "tcgplayer_unavailable" },
    };
  }
}
