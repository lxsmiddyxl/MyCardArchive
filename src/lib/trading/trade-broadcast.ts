"use client";

import { getRealtimePostgresClient } from "@/lib/realtime/channels";
export type TradeNegotiationBroadcastKind = "typing" | "reviewing_offer";

export type TradeNegotiationPayload = {
  fromUserId: string;
  kind: TradeNegotiationBroadcastKind;
};

const EVENT = "negotiation_v1" as const;

export type TradeNegotiationConnection = {
  send: (kind: TradeNegotiationBroadcastKind) => void;
  dispose: () => void;
};

/**
 * Single broadcast channel per trade tab for negotiation hints (typing, reviewing offer).
 */
export function connectTradeNegotiationBroadcast(
  tradeId: string,
  currentUserId: string,
  onPayload: (p: TradeNegotiationPayload) => void
): TradeNegotiationConnection {
  const supabase = getRealtimePostgresClient();
  const topic = `trade-negotiation:${tradeId}`;
  const channel = supabase.channel(topic, {
    config: { broadcast: { ack: false } },
  });

  channel.on("broadcast", { event: EVENT }, (raw: { payload?: Record<string, unknown> }) => {
    const pl = raw?.payload;
    if (!pl || typeof pl !== "object") return;
    const fromUserId = typeof pl.fromUserId === "string" ? pl.fromUserId : "";
    const kind = pl.kind === "typing" || pl.kind === "reviewing_offer" ? pl.kind : null;
    if (!fromUserId || !kind || fromUserId === currentUserId) return;
    onPayload({ fromUserId, kind });
  });

  channel.subscribe();

  let disposed = false;
  return {
    send: (kind) => {
      if (disposed) return;
      void channel.send({
        type: "broadcast",
        event: EVENT,
        payload: { fromUserId: currentUserId, kind },
      });
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      void supabase.removeChannel(channel);
    },
  };
}
