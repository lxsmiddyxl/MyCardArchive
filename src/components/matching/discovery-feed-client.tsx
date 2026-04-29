"use client";

import { MatchCard } from "@/components/matching/match-card";
import { McaVirtualList } from "@/components/ui/mca-virtual-list";
import { DiscoveryFeedSkeleton } from "@/components/ui/skeleton";
import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { Panel } from "@/mca-ui/panel";
import type { UserMatch } from "@/lib/matching/types";
import { useListRenderStats, useSuspenseProfile } from "@/lib/telemetry";
import { useMemo } from "react";

const FEED_VIRTUAL_THRESHOLD = 8;

export type DiscoveryFeedClientProps = {
  matches: UserMatch[];
  loading: boolean;
};

/**
 * Feed-style layout for top matches (no polling; data from parent).
 */
export function DiscoveryFeedClient({ matches, loading }: DiscoveryFeedClientProps) {
  const telemetryCtx = useMemo(
    () => ({
      componentName: "DiscoveryFeedClient",
      surfaceName: "discovery-feed",
    }),
    []
  );
  useSuspenseProfile("discovery-feed", telemetryCtx);
  useListRenderStats("discovery-feed", matches.length, telemetryCtx);

  const useVirtual = matches.length >= FEED_VIRTUAL_THRESHOLD;

  return (
    <Panel elevated className="border-mca-border bg-mca-surface/40 p-mca-md shadow-mca-card">
      <div className="flex items-start gap-mca-sm">
        <Icon src={McaIcons.system.info} size="md" alt="" className="mt-mca-trace shrink-0 text-mca-accent/90" />
        <div>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Top matches</p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">
            Discovery feed — ranked by score; who lines up with your haves and wants.
          </p>
        </div>
      </div>
      {loading ? (
        <div role="status" aria-live="polite" aria-busy="true" className="mt-mca-md">
          <span className="sr-only">Loading discovery feed</span>
          <p className="text-mca-body text-mca-ink-muted">Loading…</p>
          <DiscoveryFeedSkeleton rows={2} />
        </div>
      ) : matches.length === 0 ? (
        <p className="mt-mca-md text-mca-body text-mca-ink-subtle">
          No discovery matches yet. Sync your want/have index when available.
        </p>
      ) : useVirtual ? (
        <McaVirtualList
          className="mt-mca-md max-h-[min(60vh,720px)] min-h-0"
          items={matches}
          ariaLabel="Top matching trainers"
          estimateSize={200}
          getItemKey={(m) => m.userId}
          renderItem={(m) => (
            <div role="listitem" className="pb-mca-md">
              <MatchCard match={m} variant="feed" />
            </div>
          )}
          telemetry={{ name: "discovery-feed", ctx: telemetryCtx }}
        />
      ) : (
        <ul className="mt-mca-md space-y-mca-md">
          {matches.map((m) => (
            <li key={m.userId}>
              <MatchCard match={m} variant="feed" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
