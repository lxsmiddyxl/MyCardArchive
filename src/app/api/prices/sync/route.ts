import { createClient } from "@/lib/supabase/route";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROVIDER = "tcgplayer" as const;
const BATCH = 200;

function mockMarketPrice(cardId: string): number {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) {
    h = (h * 31 + cardId.charCodeAt(i)) | 0;
  }
  const base = (Math.abs(h) % 9500) / 100;
  return Math.round((base + 0.99) * 100) / 100;
}

async function authorizeSync(request: Request): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.PRICE_SYNC_SECRET?.trim();
  const authz = request.headers.get("authorization");
  if (secret && authz === `Bearer ${secret}`) {
    return { ok: true };
  }
  const headerSecret = request.headers.get("x-price-sync-secret");
  if (secret && headerSecret === secret) {
    return { ok: true };
  }

  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (adminEmails.length > 0) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.trim().toLowerCase();
    if (email && adminEmails.includes(email)) {
      return { ok: true };
    }
  }

  if (!secret && adminEmails.length === 0) {
    return { ok: false, reason: "Price sync is not configured (PRICE_SYNC_SECRET or ADMIN_EMAILS)." };
  }

  return { ok: false, reason: "Unauthorized" };
}

async function POST_handler(request: Request) {
  const auth = await authorizeSync(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason ?? "Unauthorized" },
      { status: 401 }
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role client is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  let body: { limit?: number } = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as { limit?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const maxCards =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.min(5000, Math.max(1, Math.floor(body.limit)))
      : 2000;

  const { data: cards, error: cardsErr } = await admin
    .from("cards")
    .select("id, user_id")
    .limit(maxCards);

  if (cardsErr) {
    return NextResponse.json({ error: cardsErr.message }, { status: 500 });
  }

  const list = cards ?? [];
  let updated = 0;
  const affectedDeckIds = new Set<string>();

  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    const upsertRows = chunk.map((c) => {
      const market_price = mockMarketPrice(c.id);
      return {
        card_id: c.id,
        user_id: c.user_id,
        provider: PROVIDER,
        market_price,
        currency: "USD",
        raw_json: { source: "mock_sync", synced_at: new Date().toISOString() } as const,
      };
    });

    const { error: upErr } = await admin.from("card_prices").upsert(upsertRows, {
      onConflict: "card_id,provider",
    });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const historyRows = upsertRows.map((r) => ({
      card_id: r.card_id,
      market_price: r.market_price,
      currency: "USD",
      provider: PROVIDER,
    }));

    const { error: histErr } = await admin.from("card_price_history").insert(historyRows);
    if (histErr) {
      return NextResponse.json({ error: histErr.message }, { status: 500 });
    }

    updated += chunk.length;

    const ids = chunk.map((c) => c.id);
    const { data: deckRows, error: deckErr } = await admin
      .from("deck_cards")
      .select("deck_id")
      .in("card_id", ids);
    if (deckErr) {
      return NextResponse.json({ error: deckErr.message }, { status: 500 });
    }
    (deckRows ?? []).forEach((r) => {
      if (r.deck_id) affectedDeckIds.add(r.deck_id);
    });
  }

  let decksRefreshed = 0;
  for (const deckId of affectedDeckIds) {
    const { error: rpcErr } = await admin.rpc("compute_deck_stats", { deck_id: deckId });
    if (rpcErr) {
      return NextResponse.json(
        { error: rpcErr.message, updated, decksRefreshed },
        { status: 500 }
      );
    }
    decksRefreshed++;
  }

  return NextResponse.json({
    provider: PROVIDER,
    updated_cards: updated,
    decks_refreshed: decksRefreshed,
  });
}

export const POST = defineRouteSimple("POST /api/prices/sync", POST_handler);
