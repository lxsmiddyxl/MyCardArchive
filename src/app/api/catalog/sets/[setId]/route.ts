import { createClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/** GET — set row + cards in set. */
async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const setId = context.params["setId"]?.trim();
  if (!setId) {
    return NextResponse.json({ error: "Invalid set id" }, { status: 400 });
  }

  const { data: setRow, error: setErr } = await supabase
    .from("catalog_sets")
    .select("*")
    .eq("id", setId)
    .maybeSingle();

  if (setErr) {
    return NextResponse.json({ error: setErr.message }, { status: 500 });
  }

  if (!setRow) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  const { data: cards, error: cardErr } = await supabase
    .from("catalog_cards")
    .select("*")
    .eq("set_id", setId)
    .order("number", { ascending: true });

  if (cardErr) {
    return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }

  return NextResponse.json({ set: setRow, cards: cards ?? [] });
}

export const GET = defineRoute("GET /api/catalog/sets/[setId]", GET_handler);
