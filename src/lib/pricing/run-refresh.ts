import { fetchCardmarketPrice } from "@/lib/pricing/cardmarket";
import { fetchEbaySoldPrice } from "@/lib/pricing/ebay";
import {
  normalizePriceData,
  type NormalizedPriceSummary,
} from "@/lib/pricing/normalize-price";
import { fetchTcgplayerPrice } from "@/lib/pricing/tcgplayer";
import type { Database, Json } from "@/lib/supabase/types";
import type { PriceData } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PricingCardInput = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
};

function rowsToPriceData(
  rows: Database["public"]["Tables"]["card_prices"]["Row"][]
): PriceData[] {
  return rows.map((r) => ({
    provider: r.provider,
    market_price: r.market_price != null ? Number(r.market_price) : null,
    currency: r.currency,
    raw: (r.raw_json as Record<string, unknown>) ?? {},
  }));
}

export type PricingRefreshResult =
  | {
      ok: true;
      summary: NormalizedPriceSummary;
      rows: Database["public"]["Tables"]["card_prices"]["Row"][];
    }
  | { ok: false; error: string };

/**
 * Fetches mock provider quotes, upserts `card_prices`, returns stored rows + summary.
 */
export async function executePricingRefresh(
  client: SupabaseClient<Database>,
  userId: string,
  card: PricingCardInput
): Promise<PricingRefreshResult> {
  try {
    const { data: owned, error: ownErr } = await client
      .from("cards")
      .select("id")
      .eq("id", card.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (ownErr) {
      return { ok: false, error: ownErr.message };
    }
    if (!owned) {
      return { ok: false, error: "Card not found" };
    }

    const ctx = {
      name: card.name,
      number: card.number,
      rarity: card.rarity,
    };

    const [a, b, c] = await Promise.all([
      fetchTcgplayerPrice(ctx),
      fetchEbaySoldPrice(ctx),
      fetchCardmarketPrice(ctx),
    ]);

    const quotes: PriceData[] = [a, b, c];

    const upsertRows = quotes.map((p) => ({
      card_id: card.id,
      user_id: userId,
      provider: p.provider,
      market_price: p.market_price,
      currency: p.currency,
      raw_json: (p.raw ?? {}) as Json,
    }));

    const { error: upErr } = await client.from("card_prices").upsert(upsertRows, {
      onConflict: "card_id,provider",
    });

    if (upErr) {
      return { ok: false, error: upErr.message };
    }

    const { data: stored, error: readErr } = await client
      .from("card_prices")
      .select("*")
      .eq("card_id", card.id)
      .eq("user_id", userId)
      .order("provider", { ascending: true });

    if (readErr) {
      return { ok: false, error: readErr.message };
    }

    const rows = stored ?? [];
    const summaryFromDb = normalizePriceData(rowsToPriceData(rows));

    return {
      ok: true,
      summary: summaryFromDb,
      rows,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "refresh_failed";
    return { ok: false, error: msg };
  }
}
