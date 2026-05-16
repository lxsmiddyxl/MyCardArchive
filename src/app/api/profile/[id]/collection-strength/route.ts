import { errorJson, withContextId } from "@/lib/api/route-helpers";
import { collectionStrengthCategory } from "@/lib/profile/collection-strength";
import type { CollectionValueCacheRow } from "@/lib/value/value-identity-helpers";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const profileId = context.params.id?.trim();
  if (!profileId || !isUuidString(profileId)) {
    return errorJson(ctx, "Invalid profile id", 400);
  }

  const supabase = createClient();

  const [cardsRes, bindersRes, showcasesRes, tradesRes, valueRes] = await Promise.all([
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("user_id", profileId),
    supabase.from("binders").select("id", { count: "exact", head: true }).eq("user_id", profileId),
    supabase.from("collection_showcases").select("id", { count: "exact", head: true }).eq("user_id", profileId),
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .or(`initiator_id.eq.${profileId},recipient_id.eq.${profileId}`)
      .eq("status", "completed"),
    supabase.rpc("get_user_collection_value", { p_user_id: profileId }),
  ]);

  const uniqueCards = cardsRes.count ?? 0;
  const binderCount = bindersRes.count ?? 0;
  const showcaseCount = showcasesRes.count ?? 0;
  const tradesCompleted = tradesRes.count ?? 0;

  const rawValue = Array.isArray(valueRes.data) ? valueRes.data[0] : valueRes.data;
  const valueRow = rawValue as {
    estimated_value_cents?: number;
    total_cards?: number;
    unique_cards?: number;
    high_rarity_count?: number;
  } | null;
  const cache: CollectionValueCacheRow = {
    estimatedValueCents: valueRow?.estimated_value_cents ?? 0,
    totalCards: valueRow?.total_cards ?? uniqueCards,
    uniqueCards: valueRow?.unique_cards ?? uniqueCards,
    highRarityCount: valueRow?.high_rarity_count ?? 0,
    lastRefreshedAt: null,
  };
  const rarityScore = Math.min(1, (cache.highRarityCount ?? 0) / 50);

  const strength = collectionStrengthCategory({
    uniqueCards,
    binderCount,
    showcaseCount,
    tradesCompleted,
    rarityScore,
  });

  return NextResponse.json({ success: true, context_id: ctx.contextId, strength });
}

export const GET = defineRoute("GET /api/profile/[id]/collection-strength", GET_handler);
