import {
  executePricingRefresh,
  type PricingCardInput,
} from "@/lib/pricing/run-refresh";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { PriceData } from "@/lib/types/database";
import { normalizePriceData } from "@/lib/pricing/normalize-price";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

function rowsToPriceData(
  rows: Database["public"]["Tables"]["card_prices"]["Row"][]
): PriceData[] {
  return rows.map((r) => ({
    provider: r.provider,
    market_price: r.market_price != null ? Number(r.market_price) : null,
    currency: r.currency,
    raw: (r.raw_json as Record<string, unknown>) ?? {},
  }));
}

async function ensureCardOwned(
  client: ReturnType<typeof createClient>,
  userId: string,
  cardId: string
): Promise<PricingCardInput | null> {
  const { data, error } = await client
    .from("cards")
    .select("id, name, number, rarity")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    number: data.number,
    rarity: data.rarity,
  };
}

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const params = context.params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = params["cardId"]?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const card = await ensureCardOwned(supabase, user.id, cardId);
  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("card_prices")
    .select("*")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .order("provider", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const summary = normalizePriceData(rowsToPriceData(list));

  return NextResponse.json({ summary, rows: list });
}

async function POST_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const params = context.params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = params["cardId"]?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const card = await ensureCardOwned(supabase, user.id, cardId);
  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await executePricingRefresh(supabase, user.id, card);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    summary: result.summary,
    rows: result.rows,
  });
}

export const GET = defineRoute("GET /api/pricing/[cardId]", GET_handler);
export const POST = defineRoute("POST /api/pricing/[cardId]", POST_handler);
