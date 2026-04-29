import {
  cacheKeyTradeDetail,
  effectiveTtl,
  getCache,
  invalidateCache,
  isCacheEnabled,
  setCache,
  ttlCollectionMs,
} from "@/lib/cache";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import { emitAfterTradePatch } from "@/lib/notifications/trade-events";
import { getTradeById, updateTradeStatus } from "@/lib/trading/db";
import { tradeDbErrorStatus } from "@/lib/trading/http";
import type { TradeAction } from "@/lib/trading/validation";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { logger } from "@/lib/telemetry/logger";
import { logTradePatchTelemetry } from "@/lib/telemetry/trade-lifecycle";
import { NextResponse } from "next/server";

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

  const hpToken = markHotPathStart("hp:trade:detail");
  try {
    const cacheKey = cacheKeyTradeDetail(user.id, id);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const trade = await getTradeById(supabase, id, user.id);
    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    const body = { trade };
    if (isCacheEnabled()) {
      setCache(cacheKey, body, effectiveTtl(ttlCollectionMs()));
    }
    return NextResponse.json(body);
  } finally {
    markHotPathEnd(hpToken);
  }
}

async function PATCH_handler(request: Request, context: { params: Record<string, string> }) {
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

  const action = body.action;
  if (typeof action !== "string" || !ACTIONS.has(action as TradeAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const started = Date.now();
  const result = await updateTradeStatus(supabase, {
    tradeId: id,
    userId: user.id,
    action: action as TradeAction,
  });

  const latencyMs = Date.now() - started;

  if (!result.ok) {
    logger.warn({
      eventType: "trade.updated",
      userId: user.id,
      success: false,
      latencyMs,
      payloadSummary: { tradeId: id, action, error: result.error },
    });
    return NextResponse.json({ error: result.error }, { status: tradeDbErrorStatus(result.error) });
  }

  invalidateCache(cacheKeyTradeDetail(user.id, id));

  const trade = await getTradeById(supabase, id, user.id);
  if (trade) {
    logTradePatchTelemetry(
      action as TradeAction,
      {
        tradeId: trade.id,
        initiatorId: trade.createdBy,
        recipientId: trade.counterpartyId,
      },
      user.id,
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
      user.id,
      action as TradeAction
    );
  }

  return NextResponse.json({ trade, status: result.status });
}

export const GET = defineRoute("GET /api/trades/[id]", GET_handler);
export const PATCH = defineRoute("PATCH /api/trades/[id]", PATCH_handler);
