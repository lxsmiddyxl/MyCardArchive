import { updateHaveListIndex } from "@/lib/matching/index-maintenance";
import { getCardCount, getEffectiveUserTier } from "@/lib/tier/check-limits";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type CardNested = {
  catalog_card_id: string | null;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
};

async function POST_handler(
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

  let body: { binder_id?: string };
  try {
    body = (await request.json()) as { binder_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const binderId = typeof body.binder_id === "string" ? body.binder_id.trim() : "";
  if (!binderId) {
    return NextResponse.json({ error: "binder_id is required" }, { status: 400 });
  }

  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (binderErr) {
    return NextResponse.json({ error: binderErr.message }, { status: 500 });
  }
  if (!binder) {
    return NextResponse.json({ error: "Binder not found" }, { status: 404 });
  }

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("id, is_public")
    .eq("id", deckId)
    .maybeSingle();

  if (deckErr) {
    return NextResponse.json({ error: deckErr.message }, { status: 500 });
  }
  if (!deck || !deck.is_public) {
    return NextResponse.json(
      { error: "Deck is not available for export" },
      { status: 404 }
    );
  }

  const { data: deckCardRows, error: dcErr } = await supabase
    .from("deck_cards")
    .select(
      `
      quantity,
      cards (
        catalog_card_id,
        name,
        number,
        rarity,
        image_url
      )
    `
    )
    .eq("deck_id", deckId);

  if (dcErr) {
    return NextResponse.json({ error: dcErr.message }, { status: 500 });
  }

  const inserts: {
    catalog_card_id: string | null;
    name: string;
    number: string | null;
    rarity: string | null;
    image_url: string | null;
  }[] = [];

  for (const row of deckCardRows ?? []) {
    const r = row as {
      quantity: number | null;
      cards: unknown;
    };
    const qty = Math.max(0, Math.floor(Number(r.quantity) || 0));
    const card = firstRelation(r.cards as CardNested | CardNested[] | null);
    if (!card || qty < 1) continue;
    const name = typeof card.name === "string" && card.name.trim() ? card.name.trim() : "Card";
    for (let i = 0; i < qty; i++) {
      inserts.push({
        catalog_card_id: card.catalog_card_id ?? null,
        name,
        number: card.number ?? null,
        rarity: card.rarity ?? null,
        image_url: card.image_url ?? null,
      });
    }
  }

  if (inserts.length === 0) {
    return NextResponse.json({ error: "No cards to copy from this deck" }, { status: 400 });
  }

  const count = await getCardCount(supabase);
  const tier = await getEffectiveUserTier(supabase);
  if (tier && tier.card_limit > 0 && count + inserts.length > tier.card_limit) {
    return NextResponse.json(
      {
        error: `Adding ${inserts.length} cards would exceed your plan limit (${tier.card_limit.toLocaleString()} cards).`,
      },
      { status: 403 }
    );
  }

  let added = 0;
  for (const ins of inserts) {
    const { data: inserted, error: insErr } = await supabase
      .from("cards")
      .insert({
        binder_id: binderId,
        user_id: user.id,
        name: ins.name,
        number: ins.number,
        rarity: ins.rarity,
        image_url: ins.image_url,
        ...(ins.catalog_card_id ? { catalog_card_id: ins.catalog_card_id } : {}),
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message ?? "Insert failed", added, partial: true },
        { status: 500 }
      );
    }

    try {
      await updateHaveListIndex(supabase, user.id, inserted.id, 1);
    } catch (e) {
      await supabase.from("cards").delete().eq("id", inserted.id).eq("user_id", user.id);
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Could not update have-list index",
          added,
          partial: true,
        },
        { status: 500 }
      );
    }
    added += 1;
  }

  return NextResponse.json({ ok: true, added, binder_id: binderId });
}

export const POST = defineRoute(
  "POST /api/public/decks/[deckId]/copy-to-binder",
  POST_handler
);
