import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_IDS = 48;

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ cards: {} });
  }

  const { data, error } = await supabase
    .from("catalog_cards")
    .select("id, name, number, rarity, image_small, image_large, set_id, catalog_sets(name)")
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    map[row.id] = row as unknown as Record<string, unknown>;
  }

  return NextResponse.json({ cards: map });
}

export const GET = defineRouteSimple("GET /api/market/catalog-preview", GET_handler);
