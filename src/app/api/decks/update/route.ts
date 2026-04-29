import { defineRouteSimple } from "@/lib/server/api-route";
import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { createClient } from "@/lib/supabase/route";
import type { Database } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  deck_id?: string;
  name?: string;
  description?: string;
  format?: string;
  is_public?: boolean;
};

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
    const raw: unknown = await request.json();
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    body = raw as Body;
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

  const patch: Database["public"]["Tables"]["decks"]["Update"] = {};
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.description === "string") {
    patch.description = body.description;
  }
  if (typeof body.format === "string" && body.format.trim()) {
    patch.format = body.format.trim();
  }
  if (typeof body.is_public === "boolean") {
    patch.is_public = body.is_public;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ deck: existing });
  }

  const { data, error } = await supabase
    .from("decks")
    .update(patch)
    .eq("id", deckId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deck: data });
}

export const POST = defineRouteSimple("POST /api/decks/update", POST_handler);
