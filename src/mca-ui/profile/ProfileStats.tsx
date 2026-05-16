"use client";

import type { BinderProfileStats } from "@/lib/binders/profile-stats";
import { Panel } from "@/mca-ui/panel";

export type ProfileStatsProps = {
  stats: BinderProfileStats;
};

export function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Collector stats</h2>
      <dl className="grid grid-cols-2 gap-mca-sm text-sm sm:grid-cols-4">
        <div>
          <dt className="text-mca-ink-subtle">Cards</dt>
          <dd className="font-semibold text-mca-ink-body">{stats.total_cards}</dd>
        </div>
        <div>
          <dt className="text-mca-ink-subtle">Unique</dt>
          <dd className="font-semibold text-mca-ink-body">{stats.unique_cards}</dd>
        </div>
        <div>
          <dt className="text-mca-ink-subtle">Sets</dt>
          <dd className="font-semibold text-mca-ink-body">{stats.sets_represented}</dd>
        </div>
        <div>
          <dt className="text-mca-ink-subtle">Binders</dt>
          <dd className="font-semibold text-mca-ink-body">{stats.binder_count}</dd>
        </div>
      </dl>
      {stats.badges.length ? (
        <div className="flex flex-wrap gap-mca-xs">
          {stats.badges.map((b) => (
            <span
              key={b}
              className="rounded-mca-pill border border-mca-accent-border/40 bg-mca-accent-border/15 px-mca-sm py-mca-trace text-xs font-medium text-mca-accent"
            >
              {b}
            </span>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
