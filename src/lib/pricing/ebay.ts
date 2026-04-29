import type { PriceData } from "@/lib/types/database";
import type { CardPriceLookup } from "./tcgplayer";

/**
 * Mock eBay sold-comps median (US). Replace with Finding/Browse API later.
 * Never throws.
 */
export async function fetchEbaySoldPrice(
  card: CardPriceLookup
): Promise<PriceData> {
  try {
    const seed = card.name.length + (card.number?.length ?? 0);
    const mockSold = [
      11.2,
      10.5,
      12.99,
      11.0,
      10.8 + (seed % 5) * 0.15,
    ];
    const sorted = [...mockSold].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    return {
      provider: "ebay",
      market_price: mid ?? null,
      currency: "USD",
      raw: {
        mock: true,
        source: "ebay_sold",
        sample_size: mockSold.length,
        sold_prices: mockSold,
      },
    };
  } catch {
    return {
      provider: "ebay",
      market_price: null,
      currency: "USD",
      raw: { mock: true, error: "ebay_unavailable" },
    };
  }
}
