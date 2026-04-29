import { emitAfterTradeCreate } from "@/lib/notifications/trade-events";
import { createTradeDraft, getTradeById } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import { computeTradeSummary } from "@/lib/trading";
import type { TradeLineInput } from "@/lib/trading/types";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { logger } from "@/lib/telemetry/logger";
import { logTradeCreated } from "@/lib/telemetry/trade-lifecycle";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseLines(raw: unknown): TradeLineInput[] {
  if (!Array.isArray(raw)) return [];
  const out: TradeLineInput[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const cardId = typeof o.cardId === "string" ? o.cardId.trim() : "";
    const q = typeof o.quantity === "number" && o.quantity >= 1 ? o.quantity : 1;
    if (!cardId) continue;
    out.push({ cardId, quantity: q });
  }
  return out;
}

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const counterpartyId =
    typeof body.counterpartyId === "string" ? body.counterpartyId.trim() : "";
  if (!counterpartyId) {
    return NextResponse.json({ error: "counterpartyId is required" }, { status: 400 });
  }

  const offerLines =
    parseLines(body.offerLines).length > 0
      ? parseLines(body.offerLines)
      : parseLines(body.offerSideA);
  const requestLines =
    parseLines(body.requestLines).length > 0
      ? parseLines(body.requestLines)
      : parseLines(body.offerSideB);

  const sendNow = Boolean(body.sendNow);

  const started = Date.now();
  const result = await createTradeDraft(supabase, {
    creatorId: user.id,
    counterpartyId,
    offerLines,
    requestLines,
    initialStatus: sendNow ? "sent" : "draft",
  });

  if (!result.ok) {
    logger.warn({
      eventType: "trade.created",
      userId: user.id,
      success: false,
      latencyMs: Date.now() - started,
      payloadSummary: { initiatorId: user.id, recipientId: counterpartyId, error: result.error },
    });
    return NextResponse.json({ error: result.error }, { status: tradeDbErrorStatus(result.error) });
  }

  const trade = await getTradeById(supabase, result.tradeId, user.id);
  if (!trade) {
    logger.warn({
      eventType: "trade.created",
      userId: user.id,
      success: false,
      latencyMs: Date.now() - started,
      payloadSummary: { tradeId: result.tradeId, initiatorId: user.id, recipientId: counterpartyId },
    });
    return NextResponse.json({ error: "Trade created but could not be loaded." }, { status: 500 });
  }

  const allLines = [...trade.offerSideA, ...trade.offerSideB];
  const summary = computeTradeSummary(allLines);

  await emitAfterTradeCreate(
    supabase,
    {
      id: trade.id,
      status: trade.status,
      createdBy: trade.createdBy,
      counterpartyId: trade.counterpartyId,
    },
    user.id
  );

  logTradeCreated(
    {
      tradeId: trade.id,
      initiatorId: trade.createdBy,
      recipientId: trade.counterpartyId,
      status: trade.status,
    },
    user.id,
    Date.now() - started,
    true
  );

  return NextResponse.json({
    trade,
    summary,
  });
}

export const POST = defineRouteSimple("POST /api/trades/create", POST_handler);
