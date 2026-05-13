import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { emitAfterTradeCreate } from "@/lib/notifications/trade-events";
import { createTradeDraft, getTradeById } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import { computeTradeSummary } from "@/lib/trading";
import type { TradeLineInput } from "@/lib/trading/types";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { logger } from "@/lib/telemetry/logger";
import { logTradeCreated } from "@/lib/telemetry/trade-lifecycle";

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
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
  }

  const counterpartyId =
    typeof body.counterpartyId === "string" ? body.counterpartyId.trim() : "";
  if (!counterpartyId) {
    return errorJson(ctx, "counterpartyId is required", 400, { code: ApiErrorCode.BAD_REQUEST });
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
    creatorId: session.userId,
    counterpartyId,
    offerLines,
    requestLines,
    initialStatus: sendNow ? "sent" : "draft",
  });

  if (!result.ok) {
    logger.warn({
      eventType: "trade.created",
      userId: session.userId,
      success: false,
      latencyMs: Date.now() - started,
      payloadSummary: { initiatorId: session.userId, recipientId: counterpartyId, error: result.error },
    });
    return errorJson(ctx, result.error, tradeDbErrorStatus(result.error), {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const trade = await getTradeById(supabase, result.tradeId, session.userId);
  if (!trade) {
    logger.warn({
      eventType: "trade.created",
      userId: session.userId,
      success: false,
      latencyMs: Date.now() - started,
      payloadSummary: { tradeId: result.tradeId, initiatorId: session.userId, recipientId: counterpartyId },
    });
    return errorJson(ctx, "Trade created but could not be loaded.", 500, { code: ApiErrorCode.INTERNAL });
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
    session.userId
  );

  logTradeCreated(
    {
      tradeId: trade.id,
      initiatorId: trade.createdBy,
      recipientId: trade.counterpartyId,
      status: trade.status,
    },
    session.userId,
    Date.now() - started,
    true
  );

  return successJson(ctx, { trade, summary });
}

export const POST = defineRouteSimple("POST /api/trades/create", POST_handler);
