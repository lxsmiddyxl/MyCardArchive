import { createClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/** GET — single catalog card + parent set. */
async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const cardId = context.params["cardId"]?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const { data: card, error } = await supabase
    .from("catalog_cards")
    .select("*, catalog_sets(*)")
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ card });
}

export const GET = defineRoute("GET /api/catalog/cards/[cardId]", GET_handler);
