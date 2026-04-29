import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/watchlist", surfaceName: "marketplace" } as const;

/** `catalog_cards.id` is text (not UUID); keep validation aligned with the FK. */
function isValidCatalogCardId(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && t.length <= 256;
}

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("market_watchlist")
    .select("catalog_card_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const ids = list.map((r) => r.catalog_card_id).filter(Boolean);
  let cardsById: Record<string, { id: string; name: string; number: string; set_id: string }> = {};
  if (ids.length > 0) {
    const { data: cards, error: cErr } = await supabase
      .from("catalog_cards")
      .select("id, name, number, set_id")
      .in("id", ids);
    if (!cErr && cards) {
      cardsById = Object.fromEntries(cards.map((c) => [c.id, c]));
    }
  }

  const items = list.map((r) => ({
    catalog_card_id: r.catalog_card_id,
    created_at: r.created_at,
    catalog_cards: cardsById[r.catalog_card_id] ?? null,
  }));

  return NextResponse.json({ items });
}

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { catalog_card_id?: string } = {};
  try {
    body = (await request.json()) as { catalog_card_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const catalogCardId = body.catalog_card_id?.trim();
  if (!catalogCardId || !isValidCatalogCardId(catalogCardId)) {
    logApiValidationFailure("POST /api/market/watchlist", "catalog_card_id", "invalid");
    return NextResponse.json({ error: "catalog_card_id required" }, { status: 400 });
  }

  const { error } = await supabase.from("market_watchlist").insert({
    user_id: user.id,
    catalog_card_id: catalogCardId,
  });

  if (error) {
    if (error.code === "23505") {
      mcaLog.event("market.watchlist.add", { viewerId: user.id, catalogCardId, duplicate: true }, CTX);
      return NextResponse.json({ ok: true, catalogCardId, alreadyWatched: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("market.watchlist.add", { viewerId: user.id, catalogCardId }, CTX);
  return NextResponse.json({ ok: true, catalogCardId });
}

async function DELETE_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const catalogCardId = url.searchParams.get("catalog_card_id")?.trim();
  if (!catalogCardId || !isValidCatalogCardId(catalogCardId)) {
    logApiValidationFailure("DELETE /api/market/watchlist", "catalog_card_id", "invalid");
    return NextResponse.json({ error: "catalog_card_id query required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("market_watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("catalog_card_id", catalogCardId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("market.watchlist.remove", { viewerId: user.id, catalogCardId }, CTX);
  return NextResponse.json({ ok: true, catalogCardId });
}

export const GET = defineRouteSimple("GET /api/market/watchlist", GET_handler);
export const POST = defineRouteSimple("POST /api/market/watchlist", POST_handler);
export const DELETE = defineRouteSimple("DELETE /api/market/watchlist", DELETE_handler);
