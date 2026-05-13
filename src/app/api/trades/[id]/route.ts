import {
  cacheKeyTradeDetail,
  effectiveTtl,
  getCache,
  invalidateCache,
  isCacheEnabled,
  setCache,
  ttlCollectionMs,
} from "@/lib/cache";
import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import { emitAfterTradePatch } from "@/lib/notifications/trade-events";
import { getTradeById, updateTradeStatus } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import type { TradeAction } from "@/lib/trading/validation";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { logger } from "@/lib/telemetry/logger";
import { logTradePatchTelemetry } from "@/lib/telemetry/trade-lifecycle";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<TradeAction>([
  "send",
  "accept",
  "decline",
  "counter",
  "resend",
  "complete",
  "withdraw",
]);

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const id = context.params.id?.trim();
  if (!id) {
    return errorJson(ctx, "Invalid trade id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const hpToken = markHotPathStart("hp:trade:detail");
  try {
    const cacheKey = cacheKeyTradeDetail(session.userId, id);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey) as { trade?: unknown } | undefined;
      if (cached && cached.trade) {
        return successJson(ctx, { trade: cached.trade });
      }
    }

    const trade = await getTradeById(supabase, id, session.userId);
    if (!trade) {
      return errorJson(ctx, "Trade not found", 404, { code: ApiErrorCode.NOT_FOUND });
    }

    const payload = { trade };
    if (isCacheEnabled()) {
      setCache(cacheKey, payload, effectiveTtl(ttlCollectionMs()));
    }
    return successJson(ctx, payload);
  } finally {
    markHotPathEnd(hpToken);
  }
}

async function PATCH_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const id = context.params.id?.trim();
  if (!id) {
    return errorJson(ctx, "Invalid trade id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.PAYLOAD_INVALID });
  }

  const action = body.action;
  if (typeof action !== "string" || !ACTIONS.has(action as TradeAction)) {
    return errorJson(ctx, "Invalid action", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const started = Date.now();
  const result = await updateTradeStatus(supabase, {
    tradeId: id,
    userId: session.userId,
    action: action as TradeAction,
  });

  const latencyMs = Date.now() - started;

  if (!result.ok) {
    logger.warn({
      eventType: "trade.updated",
      userId: session.userId,
      success: false,
      latencyMs,
      payloadSummary: { tradeId: id, action, error: result.error },
    });
    return errorJson(ctx, result.error, tradeDbErrorStatus(result.error), {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  invalidateCache(cacheKeyTradeDetail(session.userId, id));

  const trade = await getTradeById(supabase, id, session.userId);
  if (trade) {
    logTradePatchTelemetry(
      action as TradeAction,
      {
        tradeId: trade.id,
        initiatorId: trade.createdBy,
        recipientId: trade.counterpartyId,
      },
      session.userId,
      latencyMs,
      true,
      { nextStatus: result.status }
    );
    await emitAfterTradePatch(
      supabase,
      {
        id: trade.id,
        createdBy: trade.createdBy,
        counterpartyId: trade.counterpartyId,
      },
      session.userId,
      action as TradeAction
    );
  }

  return successJson(ctx, { trade, status: result.status });
}

export const GET = defineRoute("GET /api/trades/[id]", GET_handler);
export const PATCH = defineRoute("PATCH /api/trades/[id]", PATCH_handler);
