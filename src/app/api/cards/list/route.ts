import { defineRouteSimple } from "@/lib/server/api-route";
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from("cards")
    .select(
      "id, binder_id, name, number, rarity, image_url, created_at, catalog_card_id, binders(id, name), catalog_cards(supertype, set_id, catalog_sets(name))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (cardsError) {
    return NextResponse.json({ error: cardsError.message }, { status: 500 });
  }

  const cards = ((cardsData as CardRow[] | null) ?? []).map((row) => {
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

  return NextResponse.json({ cards });
}

export const GET = defineRouteSimple("GET /api/cards/list", GET_handler);
