import { createClient } from "@/lib/supabase/server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * GET `?q=` — searches `catalog_cards.name` with ILIKE `%q%`.
 * Optional: `set_id`, `limit` (max 40). For compatibility, `?name=` is treated like `q`.
 * Returns `results[]` with: id, name, set, rarity, number, image_url.
 */
async function GET_handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const query =
    searchParams.get("q")?.trim() ??
    searchParams.get("name")?.trim() ??
    "";
  const setId = searchParams.get("set_id")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(40, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

  if (query.length < 1) {
    return NextResponse.json(
      { error: "q query is required", results: [] },
      { status: 400 }
    );
  }

  const supabase = createClient();
  let qb = supabase
    .from("catalog_cards")
    .select(
      "id, set_id, name, number, rarity, image_small, image_large, catalog_sets(name)"
    )
    .ilike("name", `%${escapeIlike(query)}%`)
    .limit(limit);

  if (setId.length > 0) {
    qb = qb.eq("set_id", setId);
  }

  const { data, error } = await qb;

  if (error) {
    return NextResponse.json({ error: error.message, results: [] }, { status: 500 });
  }

  const results = (data ?? []).map((row) => {
    const cs = row.catalog_sets as { name: string } | { name: string }[] | null;
    const set =
      Array.isArray(cs) ? (cs[0]?.name ?? row.set_id) : (cs?.name ?? row.set_id);
    return {
      id: row.id,
      name: row.name,
      set,
      rarity: row.rarity,
      number: row.number,
      image_url: row.image_large ?? row.image_small ?? null,
    };
  });

  return NextResponse.json({ results });
}

export const GET = defineRouteSimple("GET /api/catalog/search", GET_handler);
