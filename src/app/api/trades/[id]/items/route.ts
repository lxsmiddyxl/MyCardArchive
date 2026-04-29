import { addTradeItem, getTradeById, getTradeItemsSidesByTradeId } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = context.params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Invalid trade id" }, { status: 400 });
  }

  const sides = await getTradeItemsSidesByTradeId(supabase, id, user.id);
  if (!sides) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  return NextResponse.json({ offerSideA: sides.offerSideA, offerSideB: sides.offerSideB });
}

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = context.params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Invalid trade id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
  const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
  const side = body.side === "offer" || body.side === "request" ? body.side : null;
  const q = body.quantity;
  const quantity = typeof q === "number" && Number.isFinite(q) && q >= 1 ? q : NaN;

  if (!ownerId || !cardId || !side || !Number.isFinite(quantity)) {
    return NextResponse.json(
      {
        error: "ownerId, cardId, side (offer | request), and quantity (>= 1) are required.",
      },
      { status: 400 }
    );
  }

  const result = await addTradeItem(supabase, id, ownerId, cardId, quantity, side);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: tradeDbErrorStatus(result.error) });
  }

  const trade = await getTradeById(supabase, id, user.id);
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  return NextResponse.json({ trade });
}

export const GET = defineRoute("GET /api/trades/[id]/items", GET_handler);
export const POST = defineRoute("POST /api/trades/[id]/items", POST_handler);
