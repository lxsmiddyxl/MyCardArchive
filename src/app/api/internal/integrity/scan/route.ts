import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Debug / admin: consistency checks for the signed-in user (RLS-scoped).
 * Protected: `x-internal-telemetry-secret` OR development session.
 */
async function GET_handler(request: Request) {
  const secret = request.headers.get("x-internal-telemetry-secret");
  const secretOk =
    typeof process.env.INTERNAL_TELEMETRY_SECRET === "string" &&
    process.env.INTERNAL_TELEMETRY_SECRET.length > 0 &&
    secret === process.env.INTERNAL_TELEMETRY_SECRET;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!secretOk && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  const { data: binderRows, error: binderErr } = await supabase
    .from("binders")
    .select("id, name")
    .eq("user_id", user.id);

  if (binderErr) {
    return NextResponse.json({ error: binderErr.message }, { status: 500 });
  }

  const binderIds = (binderRows ?? []).map((b) => b.id);
  const binderChecks: { binderId: string; name: string | null; cardsActual: number }[] = [];

  for (const bid of binderIds) {
    const { count, error: cErr } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("binder_id", bid)
      .eq("user_id", user.id);

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    const row = binderRows?.find((b) => b.id === bid);
    binderChecks.push({
      binderId: bid,
      name: row?.name ?? null,
      cardsActual: count ?? 0,
    });
  }

  const { data: decks, error: deckErr } = await supabase
    .from("decks")
    .select("id, name")
    .eq("user_id", user.id)
    .limit(50);

  if (deckErr) {
    return NextResponse.json({ error: deckErr.message }, { status: 500 });
  }

  const deckChecks: { deckId: string; name: string | null; lineRows: number; qtySum: number }[] = [];

  for (const d of decks ?? []) {
    const { data: lines, error: lErr } = await supabase
      .from("deck_cards")
      .select("quantity")
      .eq("deck_id", d.id);

    if (lErr) {
      return NextResponse.json({ error: lErr.message }, { status: 500 });
    }

    const qtySum = (lines ?? []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    deckChecks.push({
      deckId: d.id,
      name: d.name,
      lineRows: lines?.length ?? 0,
      qtySum,
    });
  }

  const { data: tradeRows, error: tradeErr } = await supabase
    .from("trades")
    .select("id, status")
    .or(`created_by.eq.${user.id},counterparty_id.eq.${user.id}`)
    .limit(25);

  if (tradeErr) {
    return NextResponse.json({ error: tradeErr.message }, { status: 500 });
  }

  const latencyMs = Date.now() - started;

  return NextResponse.json({
    ok: true,
    userId: user.id,
    latencyMs,
    binders: binderChecks,
    decks: deckChecks,
    tradesSample: (tradeRows ?? []).length,
    note:
      "Counts are live queries; use for spot-checks. Negative or inconsistent qty should be investigated in DB.",
  });
}

export const GET = defineRouteSimple("GET /api/internal/integrity/scan", GET_handler);
