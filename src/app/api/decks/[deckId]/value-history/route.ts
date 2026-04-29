import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Deck total value over time: replays price history chronologically (recent window),
 * starting each card at 0 until its first snapshot in the window.
 */
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

  const deckId = context.params["deckId"]?.trim();
  if (!deckId) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }

  const { data: deck, error: deckErr } = await fetchOwnedDeck(supabase, user.id, deckId);
  if (deckErr || !deck) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Deck not found" },
      { status: deckErr ? 500 : 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = parseInt(searchParams.get("history_limit") ?? "8000", 10);
  const historyLimit = Math.min(20_000, Math.max(50, Number.isFinite(limitRaw) ? limitRaw : 8000));

  const { data: dcRows, error: dcErr } = await supabase
    .from("deck_cards")
    .select("card_id, quantity")
    .eq("deck_id", deckId);

  if (dcErr) {
    return NextResponse.json({ error: dcErr.message }, { status: 500 });
  }

  const qtyByCard = new Map<string, number>();
  for (const row of dcRows ?? []) {
    const cid = row.card_id;
    const q = Math.max(0, row.quantity ?? 0);
    qtyByCard.set(cid, (qtyByCard.get(cid) ?? 0) + q);
  }

  const cardIds = Array.from(qtyByCard.keys());
  if (cardIds.length === 0) {
    return NextResponse.json({ points: [] as { recorded_at: string; total_value: number }[] });
  }

  const { data: priceRows, error: pErr } = await supabase
    .from("card_prices")
    .select("card_id, market_price, updated_at")
    .in("card_id", cardIds)
    .eq("user_id", user.id);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const { data: histRows, error: hErr } = await supabase
    .from("card_price_history")
    .select("card_id, market_price, recorded_at")
    .in("card_id", cardIds)
    .order("recorded_at", { ascending: false })
    .limit(historyLimit);

  if (hErr) {
    return NextResponse.json({ error: hErr.message }, { status: 500 });
  }

  const sortedHistory = [...(histRows ?? [])].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  const currentPrice = new Map<string, number>();
  for (const cid of cardIds) {
    currentPrice.set(cid, 0);
  }

  function totalValue(): number {
    let s = 0;
    for (const [cid, q] of qtyByCard) {
      s += q * (currentPrice.get(cid) ?? 0);
    }
    return Math.round(s * 100) / 100;
  }

  const points: { recorded_at: string; total_value: number }[] = [];

  for (const h of sortedHistory) {
    currentPrice.set(h.card_id, Number(h.market_price ?? 0));
    points.push({ recorded_at: h.recorded_at, total_value: totalValue() });
  }

  if (points.length === 0) {
    for (const pr of priceRows ?? []) {
      currentPrice.set(pr.card_id, Number(pr.market_price ?? 0));
    }
    points.push({
      recorded_at: new Date().toISOString(),
      total_value: totalValue(),
    });
  }

  return NextResponse.json({ points });
}

export const GET = defineRoute(
  "GET /api/decks/[deckId]/value-history",
  GET_handler
);
