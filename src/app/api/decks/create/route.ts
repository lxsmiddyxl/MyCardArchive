import { assertCanCreateDeck, isDeckLimitError } from "@/lib/decks/limits";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  description?: string;
  format?: string;
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
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description : "";
  const format =
    typeof body.format === "string" && body.format.trim()
      ? body.format.trim()
      : "standard";

  try {
    await assertCanCreateDeck(supabase, user.id);
  } catch (e) {
    if (isDeckLimitError(e)) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const msg = e instanceof Error ? e.message : "Tier check failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      name,
      description,
      format,
    })
    .select("*")
    .single();

  if (error) {
    if (
      error.message.includes("Deck limit reached") ||
      error.code === "P0001"
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deck: data });
}

export const POST = defineRouteSimple("POST /api/decks/create", POST_handler);
