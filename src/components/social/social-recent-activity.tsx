"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";

export type SocialPublicActivityRow = {
  id: string;
  action: string;
  trade_id: string | null;
  created_at: string;
};

export const SocialRecentActivity = memo(function SocialRecentActivity() {
  const [rows, setRows] = useState<SocialPublicActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/social/recent-activity", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { activity?: SocialPublicActivityRow[] };
          setRows(data.activity ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(() => rows, [rows]);

  useEffect(() => {
    if (loading) return;
    mcaLog.event(
      "social.activity.view",
      { surface: "profile-recent", rowCount: preview.length, source: "social_public_activity" },
      { componentName: "SocialRecentActivity", surfaceName: "social.activity" }
    );
  }, [loading, preview.length]);

  return (
    <Panel className="border-mca-border bg-mca-surface/40 p-mca-md transition-all duration-200 ease-mca-standard">
      <div className="flex flex-col gap-mca-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Recent activity
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">
            Binder, deck, and trade-related events (synced to your public activity projection).
          </p>
        </div>
        <Link
          href="/activity"
          className="text-mca-caption font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
        >
          View all →
        </Link>
      </div>
      {loading ? (
        <p className="mt-mca-md text-mca-body text-mca-ink-muted">Loading…</p>
      ) : preview.length === 0 ? (
        <p className="mt-mca-md text-mca-body text-mca-ink-subtle">
          No binder, deck, or trade activity yet — keep collecting and it will show up here.
        </p>
      ) : (
        <ul className="mt-mca-md space-y-mca-sm">
          {preview.map((r) => (
            <li
              key={r.id}
              className="rounded-mca-control border border-mca-border/80 bg-mca-surface-elevated/30 px-mca-sm py-mca-xs"
            >
              <p className="font-mono text-mca-caption text-mca-accent/90">{r.action}</p>
              <p className="text-mca-caption text-mca-ink-subtle">
                {new Date(r.created_at).toLocaleString()}
              </p>
              {r.trade_id ? (
                <Link
                  href={`/trades/${encodeURIComponent(r.trade_id)}`}
                  className="mt-mca-xs inline-block text-mca-caption text-mca-ink-muted underline-offset-2 hover:text-mca-accent"
                >
                  Open trade
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
});
