import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import type { CardSummaryDTO } from "@/lib/dto/catalog";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CardRow = {
  id: string;
  binder_id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  created_at: string;
  catalog_card_id: string | null;
  binders: { id: string; name: string } | { id: string; name: string }[] | null;
  catalog_cards:
    | {
        supertype: string | null;
        set_id: string;
        catalog_sets: { name: string } | { name: string }[] | null;
      }
    | {
        supertype: string | null;
        set_id: string;
        catalog_sets: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: cardsData, error: cardsError } = await supabase
    .from("cards")
    .select(
      "id, binder_id, name, number, rarity, image_url, created_at, catalog_card_id, binders(id, name), catalog_cards(supertype, set_id, catalog_sets(name))"
    )
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (cardsError) {
    return errorJson(ctx, cardsError.message, 500);
  }

  const cards: (CardSummaryDTO & {
    binder_name: string | null;
    image_front_thumb_url: string | null;
    set: string | null;
    type: string | null;
  })[] = ((cardsData as CardRow[] | null) ?? []).map((row) => {
    const binder = firstRelation(row.binders);
    const catalog = firstRelation(row.catalog_cards);
    const catalogSet = firstRelation(catalog?.catalog_sets ?? null);
    return {
      id: row.id,
      binder_id: row.binder_id,
      binder_name: binder?.name ?? null,
      name: row.name,
      number: row.number,
      rarity: row.rarity,
      image_url: row.image_url,
      image_front_thumb_url: row.image_url,
      catalog_card_id: row.catalog_card_id,
      set: catalogSet?.name ?? catalog?.set_id ?? null,
      type: catalog?.supertype ?? null,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ success: true, context_id: ctx.contextId, cards });
}

export const GET = defineRouteNoArgs("GET /api/cards/list", GET_handler);
