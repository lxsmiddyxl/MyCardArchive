"use client";

import type { TradeRecord } from "@/lib/trading/types";
import { Panel } from "@/mca-ui/panel";
import { memo, useEffect, useMemo, useRef } from "react";
import { mcaLog } from "@/lib/logging/mca-log-client";

export type TradeTimelineProps = {
  trade: TradeRecord;
  telemetryCtx: { componentName: string; surfaceName: string; traceId?: string };
};

export const TradeTimeline = memo(function TradeTimeline({ trade, telemetryCtx }: TradeTimelineProps) {
  const rows = useMemo(() => {
    const out: { key: string; label: string; at: string; kind: string }[] = [
      { key: "created", label: "Trade created", at: trade.createdAt, kind: "created" },
    ];
    if (trade.updatedAt !== trade.createdAt) {
      out.push({
        key: "updated",
        label: "Offer or status updated",
        at: trade.updatedAt,
        kind: "updated",
      });
    }
    out.push({
      key: "status",
      label: `Current status: ${trade.status}`,
      at: trade.updatedAt,
      kind: "status",
    });
    return out;
  }, [trade.createdAt, trade.updatedAt, trade.status]);

  const loggedForTrade = useRef<string | null>(null);
  useEffect(() => {
    if (loggedForTrade.current === trade.id) return;
    loggedForTrade.current = trade.id;
    mcaLog.event(
      "trade.timeline.event",
      { tradeId: trade.id, kinds: rows.map((r) => r.kind) },
      telemetryCtx
    );
  }, [trade.id, rows, telemetryCtx]);

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/30 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Timeline</p>
      <ol className="mt-mca-md space-y-mca-sm border-l border-mca-border-subtle pl-mca-md">
        {rows.map((r) => (
          <li key={r.key} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-mca-accent-strong/80" />
            <p className="text-mca-caption text-mca-ink-muted">{r.label}</p>
            <p className="text-mca-caption text-mca-ink-subtle">{new Date(r.at).toLocaleString()}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
});
