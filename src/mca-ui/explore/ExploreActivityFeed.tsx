"use client";

import { extractApiPayload } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  kind: string;
  label: string;
  href: string | null;
  created_at: string;
};

export function ExploreActivityFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/explore/activity", { cache: "no-store" });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError("Could not load activity feed.");
        return;
      }
      setItems((payload as { items?: Item[] }).items ?? []);
    })();
  }, []);

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Network activity</h2>
      {error ? <p className="text-sm text-mca-error-text">{error}</p> : null}
      <ul className="space-y-mca-sm">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-mca-ink-muted">
            {item.href ? (
              <Link href={item.href} className="hover:text-mca-accent-strong/90 hover:underline">
                {item.label}
              </Link>
            ) : (
              item.label
            )}
            <span className="ml-mca-xs text-mca-ink-subtle">
              · {new Date(item.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
      {!error && items.length === 0 ? (
        <p className="text-sm text-mca-ink-muted">No recent network activity yet.</p>
      ) : null}
    </Panel>
  );
}
