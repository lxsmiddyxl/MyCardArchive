import { executePricingRefresh } from "@/lib/pricing/run-refresh";
import { createClient } from "@/lib/supabase/server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

async function POST_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, name, number, rarity")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (cardsError) {
    return NextResponse.json({ error: cardsError.message }, { status: 500 });
  }

  const list = cards ?? [];
  let refreshed = 0;
  const errors: string[] = [];

  for (const card of list) {
    const result = await executePricingRefresh(supabase, user.id, {
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
    });

    if (result.ok) {
      refreshed += 1;
    } else {
      errors.push(`${card.id}: ${result.error}`);
    }
  }

  return NextResponse.json({
    total: list.length,
    refreshed,
    failed: errors.length,
    errors: errors.slice(0, 50),
  });
}

export const POST = defineRouteNoArgs("POST /api/pricing/refresh-all", POST_handler);
