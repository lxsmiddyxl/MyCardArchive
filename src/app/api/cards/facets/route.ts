import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CardFacetRow = {
  rarity: string | null;
  catalog_cards:
    | {
        supertype: string | null;
        set_id: string;
        rarity: string | null;
        catalog_sets: { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | {
        supertype: string | null;
        set_id: string;
        rarity: string | null;
        catalog_sets: { id: string; name: string } | { id: string; name: string }[] | null;
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

  const { data, error } = await supabase
    .from("cards")
    .select(
      "rarity, catalog_cards(supertype, set_id, rarity, catalog_sets(id, name))"
    )
    .eq("user_id", session.userId)
    .limit(8000);

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  const setMap = new Map<string, string>();
  const types = new Set<string>();
  const rarities = new Set<string>();

  for (const row of (data ?? []) as CardFacetRow[]) {
    if (row.rarity && row.rarity.trim()) {
      rarities.add(row.rarity.trim());
    }
    const cc = firstRelation(row.catalog_cards);
    if (cc?.supertype && cc.supertype.trim()) {
      types.add(cc.supertype.trim());
    }
    if (cc?.rarity && cc.rarity.trim()) {
      rarities.add(cc.rarity.trim());
    }
    if (cc?.set_id) {
      const cs = firstRelation(cc.catalog_sets);
      setMap.set(cc.set_id, cs?.name?.trim() || cc.set_id);
    }
  }

  const sets = Array.from(setMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const body = {
    sets,
    types: Array.from(types).sort((a, b) => a.localeCompare(b)),
    rarities: Array.from(rarities).sort((a, b) => a.localeCompare(b)),
  };
  return NextResponse.json({ success: true, context_id: ctx.contextId, ...body });
}

export const GET = defineRouteNoArgs("GET /api/cards/facets", GET_handler);
