import { trackProductServerEvent } from "@/lib/analytics/track-product-server";
import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { parseRequestBodyZod } from "@/lib/api/request-body-schema";
import { tradesCreateBodySchema } from "@/lib/api/schemas/post-bodies";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { emitAfterTradeCreate } from "@/lib/notifications/trade-events";
import { createTradeDraft, getTradeById } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import { computeTradeSummary } from "@/lib/trading";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { logger } from "@/lib/telemetry/logger";
import { logTradeCreated } from "@/lib/telemetry/trade-lifecycle";

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
  }

  const parsed = parseRequestBodyZod(raw, tradesCreateBodySchema);
  if (!parsed.ok) {
    return errorJson(ctx, parsed.message, 400, { code: ApiErrorCode.BAD_REQUEST });
  }
  const { counterpartyId, offerLines, requestLines, sendNow } = parsed.data as {
    counterpartyId: string;
    offerLines: { cardId: string; quantity: number }[];
    requestLines: { cardId: string; quantity: number }[];
    sendNow: boolean;
  };
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

  trackProductServerEvent(session.userId, "trade_create", {
    tradeId: trade.id,
    status: trade.status,
  });

  return successJson(ctx, { trade, summary });
}

export const POST = defineRouteSimple("POST /api/trades/create", POST_handler);
