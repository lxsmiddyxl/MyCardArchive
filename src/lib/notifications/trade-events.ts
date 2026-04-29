import { createNotification, logActivity } from "@/lib/notifications/db";
import { logger } from "@/lib/telemetry/logger";
import type { Database, Json } from "@/lib/supabase/types";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { TradeStatus } from "@/lib/trading/types";
import type { TradeAction } from "@/lib/trading/validation";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cross-user inserts require the service role (RLS allows users to insert only their own rows).
 * If the service role is not configured, actor-only activity is still logged with the user client.
 */
function service(): ReturnType<typeof createServiceRoleClient> {
  return createServiceRoleClient();
}

function otherParty(createdBy: string, counterpartyId: string, actorId: string): string {
  return actorId === createdBy ? counterpartyId : createdBy;
}

async function notify(
  svc: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  recipientId: string,
  type: string,
  title: string,
  body: string | null,
  tradeId: string
): Promise<void> {
  const r = await createNotification(svc, recipientId, type, title, body, tradeId);
  if (!r.ok) {
    logger.warn({
      eventType: "notification.sent",
      userId: recipientId,
      success: false,
      payloadSummary: { type, tradeId, error: r.error },
    });
    return;
  }
  logger.info({
    eventType: "notification.sent",
    userId: recipientId,
    success: true,
    payloadSummary: { notificationId: r.id, type, tradeId },
  });
}

async function logOther(
  svc: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
  action: string,
  tradeId: string,
  metadata?: Json
): Promise<void> {
  const r = await logActivity(svc, userId, action, tradeId, metadata ?? {});
  if (!r.ok) {
    logger.warn({
      eventType: "trade_events.activity_log_failed",
      userId,
      success: false,
      payloadSummary: { role: "peer", action, tradeId, error: r.error },
    });
  }
}

async function logSelf(
  userSupabase: SupabaseClient<Database>,
  userId: string,
  action: string,
  tradeId: string,
  metadata?: Json
): Promise<void> {
  const r = await logActivity(userSupabase, userId, action, tradeId, metadata ?? {});
  if (!r.ok) {
    logger.warn({
      eventType: "trade_events.activity_log_failed",
      userId,
      success: false,
      payloadSummary: { role: "self", action, tradeId, error: r.error },
    });
  }
}

type TradeParty = {
  id: string;
  createdBy: string;
  counterpartyId: string;
};

/**
 * After POST /api/trades/create — draft or sent.
 */
export async function emitAfterTradeCreate(
  userSupabase: SupabaseClient<Database>,
  trade: TradeParty & { status: TradeStatus },
  actorId: string
): Promise<void> {
  const svc = service();
  const { id: tradeId, counterpartyId, status } = trade;

  try {
    if (status === "draft") {
      if (svc) {
        await notify(
          svc,
          counterpartyId,
          "trade_draft",
          "New trade draft",
          "A partner started a trade draft with you.",
          tradeId
        );
        await logOther(svc, counterpartyId, "trade.draft_received", tradeId, { tradeId });
      }
      await logSelf(userSupabase, actorId, "trade.draft_created", tradeId, { tradeId });
      return;
    }

    if (status === "sent") {
      if (svc) {
        await notify(
          svc,
          counterpartyId,
          "trade_sent",
          "Trade offer",
          "You have a trade offer to review.",
          tradeId
        );
        await logOther(svc, counterpartyId, "trade.offer_received", tradeId, { tradeId });
      }
      await logSelf(userSupabase, actorId, "trade.sent", tradeId, { tradeId });
    }
  } catch (e) {
    logger.warn({
      eventType: "trade_events.emit_after_trade_create_failed",
      success: false,
      payloadSummary: {
        tradeId,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

/**
 * After PATCH /api/trades/[id] — state transition.
 */
export async function emitAfterTradePatch(
  userSupabase: SupabaseClient<Database>,
  trade: TradeParty,
  actorId: string,
  action: TradeAction
): Promise<void> {
  const svc = service();
  const { id: tradeId, createdBy, counterpartyId } = trade;
  const peer = otherParty(createdBy, counterpartyId, actorId);

  try {
    switch (action) {
      case "send":
      case "resend": {
        if (svc) {
          await notify(
            svc,
            counterpartyId,
            action === "resend" ? "trade_resent" : "trade_sent",
            action === "resend" ? "Trade offer updated" : "Trade offer",
            action === "resend"
              ? "The other player sent the offer again."
              : "You have a trade offer to review.",
            tradeId
          );
          await logOther(svc, counterpartyId, "trade.offer_received", tradeId, { tradeId, action });
        }
        await logSelf(userSupabase, actorId, action === "resend" ? "trade.resent" : "trade.sent", tradeId, {
          tradeId,
        });
        break;
      }
      case "counter": {
        if (svc) {
          await notify(
            svc,
            createdBy,
            "trade_countered",
            "Counteroffer",
            "The other player updated the trade.",
            tradeId
          );
          await logOther(svc, createdBy, "trade.counter_received", tradeId, { tradeId });
        }
        await logSelf(userSupabase, actorId, "trade.countered", tradeId, { tradeId });
        break;
      }
      case "accept": {
        if (svc) {
          await notify(
            svc,
            createdBy,
            "trade_accepted",
            "Trade accepted",
            "The other player accepted the trade.",
            tradeId
          );
          await logOther(svc, createdBy, "trade.accepted_by_partner", tradeId, { tradeId });
        }
        await logSelf(userSupabase, actorId, "trade.accepted", tradeId, { tradeId });
        break;
      }
      case "decline": {
        if (svc) {
          await notify(
            svc,
            createdBy,
            "trade_declined",
            "Trade declined",
            "The other player declined the trade.",
            tradeId
          );
          await logOther(svc, createdBy, "trade.declined_by_partner", tradeId, { tradeId });
        }
        await logSelf(userSupabase, actorId, "trade.declined", tradeId, { tradeId });
        break;
      }
      case "withdraw": {
        if (svc) {
          await notify(
            svc,
            counterpartyId,
            "trade_cancelled",
            "Trade cancelled",
            "The sender withdrew the offer.",
            tradeId
          );
          await logOther(svc, counterpartyId, "trade.cancelled_by_partner", tradeId, { tradeId });
        }
        await logSelf(userSupabase, actorId, "trade.withdrawn", tradeId, { tradeId });
        break;
      }
      case "complete": {
        if (svc) {
          await notify(
            svc,
            peer,
            "trade_completed",
            "Trade completed",
            "The trade was marked complete.",
            tradeId
          );
          await logOther(svc, peer, "trade.completed_by_partner", tradeId, { tradeId });
        }
        await logSelf(userSupabase, actorId, "trade.completed", tradeId, { tradeId });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    logger.warn({
      eventType: "trade_events.emit_after_trade_patch_failed",
      success: false,
      payloadSummary: {
        tradeId,
        action,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

/**
 * After POST /api/trades/[id]/messages.
 */
export async function emitAfterTradeMessage(
  userSupabase: SupabaseClient<Database>,
  trade: TradeParty,
  senderId: string,
  messagePreview: string
): Promise<void> {
  const svc = service();
  const { id: tradeId, createdBy, counterpartyId } = trade;
  const recipientId = otherParty(createdBy, counterpartyId, senderId);
  const preview =
    messagePreview.length > 160 ? `${messagePreview.slice(0, 157)}…` : messagePreview;

  try {
    if (svc) {
      await notify(
        svc,
        recipientId,
        "trade_message",
        "New trade message",
        preview || "You have a new message on a trade.",
        tradeId
      );
      await logOther(svc, recipientId, "trade.message_received", tradeId, { tradeId });
    }
    await logSelf(userSupabase, senderId, "trade.message_sent", tradeId, { tradeId });
  } catch (e) {
    logger.warn({
      eventType: "trade_events.emit_after_trade_message_failed",
      success: false,
      payloadSummary: {
        tradeId,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}
