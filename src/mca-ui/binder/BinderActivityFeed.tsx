"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import { useEffect, useState } from "react";

type ActivityEvent = {
  id: string;
  type: string;
  label: string;
  created_at: string;
};

export type BinderActivityFeedProps = {
  binderId: string;
  limit?: number;
};

export function BinderActivityFeed({ binderId, limit = 15 }: BinderActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(
        `/api/binders/${encodeURIComponent(binderId)}/activity?limit=${limit}`,
        { cache: "no-store" }
      );
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError(extractApiErrorMessage(payload) ?? "Could not load activity");
        return;
      }
      setEvents((payload as { events?: ActivityEvent[] }).events ?? []);
    })();
  }, [binderId, limit]);

  return (
    <Panel className="space-y-mca-sm">
      <h3 className="text-sm font-semibold text-mca-ink-body">Binder activity</h3>
      {error ? <p className="text-sm text-mca-error-text">{error}</p> : null}
      {events.length === 0 && !error ? (
        <p className="text-sm text-mca-ink-muted">No activity yet.</p>
      ) : (
        <ul className="space-y-mca-sm">
          {events.map((e) => (
            <li key={e.id} className="border-b border-mca-border-subtle/60 pb-mca-sm last:border-0">
              <p className="text-sm text-mca-ink-body">{e.label}</p>
              <p className="text-xs text-mca-ink-subtle">
                {new Date(e.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
