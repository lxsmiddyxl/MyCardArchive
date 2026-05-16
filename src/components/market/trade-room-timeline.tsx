"use client";

import type { TradeRoomV2DTO } from "@/lib/dto/trade-room-v2";
import { Panel } from "@/mca-ui/panel";
import { cn } from "@/lib/ui/cn";

export type TradeRoomTimelineProps = {
  room: TradeRoomV2DTO;
  viewerId: string;
  className?: string;
};

export function TradeRoomTimeline({ room, viewerId, className }: TradeRoomTimelineProps) {
  const events: { kind: "message" | "offer"; at: string; label: string; mine: boolean }[] = [];

  for (const m of room.messages) {
    events.push({
      kind: "message",
      at: m.createdAt,
      label: m.body,
      mine: m.actorId === viewerId,
    });
  }
  for (const o of room.offers) {
    events.push({
      kind: "offer",
      at: o.createdAt,
      label: o.summaryLine,
      mine: o.fromUserId === viewerId,
    });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Panel className={cn("border-mca-border bg-mca-surface/40 p-mca-md", className)}>
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Trade room timeline
      </p>
      <p className="mt-mca-xs text-mca-caption text-mca-hint">
        Qualitative negotiation only — no payments or currency.
      </p>
      {events.length === 0 ? (
        <p className="mt-mca-md text-mca-body text-mca-ink-muted">No activity yet.</p>
      ) : (
        <ul className="mt-mca-md space-y-mca-sm">
          {events.map((e, i) => (
            <li
              key={`${e.kind}-${e.at}-${i}`}
              className={cn(
                "rounded-mca-control border px-mca-sm py-mca-xs text-mca-caption",
                e.mine ? "border-mca-accent/40 bg-mca-accent/5" : "border-mca-border/70 bg-mca-surface/50"
              )}
            >
              <span className="font-mono text-mca-ink-subtle">{e.kind === "offer" ? "Offer" : "Message"}</span>
              <p className="mt-mca-2xs text-mca-body text-mca-ink-body">{e.label}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
