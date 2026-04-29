"use client";

import type { TimelineEventPayload } from "@/lib/social/types";
import { cn } from "@/lib/ui/cn";
import { memo, useMemo, useState } from "react";

export type CollectorTimelineProps = {
  events: TimelineEventPayload[];
  className?: string;
};

function monthKey(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

export const CollectorTimeline = memo(function CollectorTimeline({
  events,
  className,
}: CollectorTimelineProps) {
  const grouped = useMemo(() => {
    const m = new Map<string, TimelineEventPayload[]>();
    for (const e of events) {
      const k = monthKey(e.date);
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return [...m.entries()];
  }, [events]);

  if (events.length === 0) {
    return (
      <p className="text-mca-caption text-mca-ink-muted">
        Milestones appear as you scan, complete binders and sets, finish journeys, and join seasonal events.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-mca-lg", className)}>
      {grouped.map(([month, rows]) => (
        <li key={month}>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">{month}</p>
          <ul className="relative mt-mca-sm border-l border-mca-border/60 pl-mca-md">
            {rows.map((ev) => (
              <TimelineRow key={`${ev.date}-${ev.type}-${ev.label}`} ev={ev} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
});

const TimelineRow = memo(function TimelineRow({ ev }: { ev: TimelineEventPayload }) {
  const [open, setOpen] = useState(false);
  const hasMeta = ev.metadata && Object.keys(ev.metadata).length > 0;
  const dateLabel = useMemo(() => {
    const d = new Date(`${ev.date}T12:00:00.000Z`);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, [ev.date]);

  return (
    <li className="relative pb-mca-md last:pb-0 motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-mca-standard">
      <span
        className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-mca-accent-strong ring-2 ring-mca-surface"
        aria-hidden
      />
      <div className="flex flex-wrap items-start gap-mca-sm">
        <span className="text-lg leading-none" aria-hidden>
          {ev.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-mca-body font-medium text-mca-ink-strong">{ev.label}</p>
          <p className="text-mca-caption text-mca-ink-muted">{dateLabel}</p>
          {hasMeta ? (
            <button
              type="button"
              className="mt-mca-xs text-mca-caption font-medium text-mca-accent underline-offset-2 hover:underline"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              {open ? "Hide details" : "Details"}
            </button>
          ) : null}
          {open && hasMeta ? (
            <pre className="mt-mca-xs max-h-40 overflow-auto rounded-mca-control border border-mca-border/60 bg-mca-chrome/20 p-mca-sm text-[11px] leading-snug text-mca-ink-muted">
              {JSON.stringify(ev.metadata, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </li>
  );
});
