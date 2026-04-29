import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { defineRouteSimple } from "@/lib/server/api-route";
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

  const { data: existing, error: fetchErr } = await fetchOwnedDeck(
    supabase,
    user.id,
    deckId
  );

  if (fetchErr || !existing) {
    return NextResponse.json(
      { error: fetchErr?.message ?? "Deck not found" },
      { status: fetchErr ? 500 : 404 }
    );
  }

  const { error } = await supabase
    .from("decks")
    .delete()
    .eq("id", deckId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/decks/delete", POST_handler);
