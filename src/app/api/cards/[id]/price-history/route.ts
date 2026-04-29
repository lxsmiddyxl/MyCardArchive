import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = context.params["id"]?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = parseInt(searchParams.get("limit") ?? "30", 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 30));

  const { data: owned, error: ownErr } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownErr) {
    return NextResponse.json({ error: ownErr.message }, { status: 500 });
  }
  if (!owned) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("card_price_history")
    .select("id, card_id, market_price, currency, provider, recorded_at")
    .eq("card_id", cardId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: (data ?? []).reverse() });
}

export const GET = defineRoute("GET /api/cards/[id]/price-history", GET_handler);
