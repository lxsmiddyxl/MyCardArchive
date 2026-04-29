import { emitAfterTradeMessage } from "@/lib/notifications/trade-events";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { addTradeMessage, getTradeById } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import { defineRoute } from "@/lib/server/api-route";
import { MUTATION_LIMITS } from "@/lib/validation/mutation-limits";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  const message = typeof body.message === "string" ? body.message : "";
  if (message.length > MUTATION_LIMITS.tradeMessageMax) {
    logApiValidationFailure("POST /api/trades/[id]/messages", "message", "max_length");
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }
  const result = await addTradeMessage(supabase, {
    tradeId: id,
    senderId: user.id,
    message,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: tradeDbErrorStatus(result.error) });
  }

  const trimmed = message.trim();
  const trade = await getTradeById(supabase, id, user.id);
  if (trade) {
    await emitAfterTradeMessage(
      supabase,
      {
        id: trade.id,
        createdBy: trade.createdBy,
        counterpartyId: trade.counterpartyId,
      },
      user.id,
      trimmed
    );
  }

  return NextResponse.json({ ok: true });
}

export const POST = defineRoute("POST /api/trades/[id]/messages", POST_handler);
