"use client";

import { extractApiPayload } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useEffect, useState } from "react";

type Entry = {
  user_id: string;
  display_name: string;
  handle: string | null;
};

export type FollowingListProps = {
  username: string;
};

export function FollowingList({ username }: FollowingListProps) {
  const [following, setFollowing] = useState<Entry[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/following`);
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) return;
      setFollowing((payload as { following?: Entry[] }).following ?? []);
    })();
  }, [username]);

  return (
    <Panel className="space-y-mca-sm">
      <h3 className="text-sm font-semibold text-mca-ink-body">Following</h3>
      <ul className="space-y-mca-xs">
        {following.map((f) => (
          <li key={f.user_id}>
            {f.handle ? (
              <Link
                href={`/u/${encodeURIComponent(f.handle)}`}
                className="text-sm text-mca-accent-strong/90 hover:underline"
              >
                {f.display_name}
              </Link>
            ) : (
              <span className="text-sm text-mca-ink-body">{f.display_name}</span>
            )}
          </li>
        ))}
      </ul>
      {following.length === 0 ? (
        <p className="text-sm text-mca-ink-muted">Not following anyone yet.</p>
      ) : null}
    </Panel>
  );
}
