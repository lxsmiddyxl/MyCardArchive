import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "api/deck-guides", surfaceName: "creator" } as const;

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const deckId = url.searchParams.get("deckId");

  if (deckId) {
    const { data, error } = await supabase
      .from("deck_guides")
      .select("*, decks(name, is_public)")
      .eq("deck_id", deckId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ guide: data });
  }

  const { data, error } = await supabase
    .from("deck_guides")
    .select("*, decks(name, is_public)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ guides: data ?? [] });
}

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    deckId?: string;
    title?: string;
    description?: string | null;
    highlights?: unknown;
    premium_sections?: unknown;
  } | null;

  if (!body || typeof body.deckId !== "string" || typeof body.title !== "string") {
    return NextResponse.json({ error: "deckId and title required" }, { status: 400 });
  }

  const highlights = Array.isArray(body.highlights) ? body.highlights : [];
  const premium_sections = Array.isArray(body.premium_sections) ? body.premium_sections : [];
  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;

  const { data, error } = await supabase
    .from("deck_guides")
    .insert({
      deck_id: body.deckId,
      user_id: user.id,
      title: body.title.trim(),
      description,
      highlights,
      premium_sections,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  mcaLog.event(
    "creator.deck_guide.create",
    { deckId: body.deckId, guideId: data.id },
    CTX
  );
  return NextResponse.json({ guide: data });
}

export const GET = defineRouteSimple("GET /api/deck-guides", GET_handler);
export const POST = defineRouteSimple("POST /api/deck-guides", POST_handler);
