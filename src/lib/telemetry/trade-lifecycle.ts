import "server-only";

import { logger } from "@/lib/telemetry/logger";
import type { TradeAction } from "@/lib/trading/validation";

type TradeParties = {
  tradeId: string;
  initiatorId: string;
  recipientId: string;
};

/** Maps API trade actions to stable telemetry event types (no PII in summaries). */
export function logTradePatchTelemetry(
  action: TradeAction,
  parties: TradeParties,
  actorId: string,
  latencyMs: number,
  success: boolean,
  extra?: Record<string, unknown>
): void {
  const payloadSummary = {
    tradeId: parties.tradeId,
    initiatorId: parties.initiatorId,
    recipientId: parties.recipientId,
    action,
    ...extra,
  };

  let eventType: string;
  switch (action) {
    case "accept":
      eventType = "trade.accepted";
      break;
    case "decline":
      eventType = "trade.rejected";
      break;
    case "withdraw":
      eventType = "trade.canceled";
      break;
    case "complete":
      eventType = "trade.completed";
      break;
    case "send":
    case "resend":
    case "counter":
      eventType = "trade.updated";
      break;
    default:
      eventType = "trade.updated";
  }

  logger.info({
    eventType,
    userId: actorId,
    success,
    latencyMs,
    payloadSummary,
  });
}

export function logTradeCreated(
  parties: TradeParties & { status: string },
  actorId: string,
  latencyMs: number,
  success: boolean
): void {
  logger.info({
    eventType: "trade.created",
    userId: actorId,
    success,
    latencyMs,
    payloadSummary: {
      tradeId: parties.tradeId,
      initiatorId: parties.initiatorId,
      recipientId: parties.recipientId,
      status: parties.status,
    },
  });
}
