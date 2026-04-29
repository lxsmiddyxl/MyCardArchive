import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { defineRouteSimple } from "@/lib/server/api-route";
import { computeAndPersistSynergy } from "@/lib/decks/stats";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = { deck_id?: string };

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deckId = body.deck_id?.trim();
  if (!deckId) {
    return NextResponse.json({ error: "deck_id is required" }, { status: 400 });
  }

  const { data: deck, error: deckErr } = await fetchOwnedDeck(
    supabase,
    user.id,
    deckId
  );

  if (deckErr || !deck) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Deck not found" },
      { status: deckErr ? 500 : 404 }
    );
  }

  const result = await computeAndPersistSynergy(supabase, deckId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ synergy_score: result.synergy_score });
}

export const POST = defineRouteSimple("POST /api/decks/synergy", POST_handler);
