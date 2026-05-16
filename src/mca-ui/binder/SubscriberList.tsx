"use client";

import { extractApiPayload } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useEffect, useState } from "react";

type Subscriber = {
  user_id: string;
  display_name: string;
  handle: string | null;
};

export type SubscriberListProps = {
  binderId: string;
};

export function SubscriberList({ binderId }: SubscriberListProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/subscribers`);
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) return;
      setSubscribers((payload as { subscribers?: Subscriber[] }).subscribers ?? []);
      setCount((payload as { count?: number }).count ?? 0);
    })();
  }, [binderId]);

  return (
    <Panel className="space-y-mca-sm">
      <h3 className="text-sm font-semibold text-mca-ink-body">
        Subscribers ({count})
      </h3>
      <ul className="space-y-mca-xs">
        {subscribers.slice(0, 8).map((s) => (
          <li key={s.user_id}>
            {s.handle ? (
              <Link href={`/u/${encodeURIComponent(s.handle)}`} className="text-sm hover:underline">
                {s.display_name}
              </Link>
            ) : (
              <span className="text-sm">{s.display_name}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
