import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { CollectionStats } from "@/lib/social/types";

/**
 * Aggregates collection stats for the current user (RLS-scoped).
 */
export async function getCollectionStatsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CollectionStats> {
  const uid = userId.trim();
  if (!uid) {
    return { cardCount: 0, binderCount: 0, deckCount: 0, tradeCount: 0 };
  }

  const [cards, binders, decks, tradesA, tradesB] = await Promise.all([
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("user_id", uid),
    supabase.from("binders").select("id", { count: "exact", head: true }).eq("user_id", uid),
    supabase.from("decks").select("id", { count: "exact", head: true }).eq("user_id", uid),
    supabase.from("trades").select("id", { count: "exact", head: true }).eq("created_by", uid),
    supabase.from("trades").select("id", { count: "exact", head: true }).eq("counterparty_id", uid),
  ]);

  const tradeCount = (tradesA.count ?? 0) + (tradesB.count ?? 0);

  return {
    cardCount: cards.count ?? 0,
    binderCount: binders.count ?? 0,
    deckCount: decks.count ?? 0,
    tradeCount,
  };
}
