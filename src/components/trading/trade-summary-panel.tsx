"use client";

import { Panel } from "@/mca-ui/panel";
import type { TradeSummaryStats } from "@/lib/trading/types";
import { memo } from "react";

export type TradeSummaryPanelProps = {
  yours: TradeSummaryStats;
  theirs: TradeSummaryStats;
  combined: TradeSummaryStats;
};

export const TradeSummaryPanel = memo(function TradeSummaryPanel({
  yours,
  theirs,
  combined,
}: TradeSummaryPanelProps) {
  return (
    <Panel elevated className="border-mca-border bg-mca-surface-elevated/40 p-mca-md shadow-mca-card">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Trade summary
      </p>
      <p className="mt-mca-xs text-mca-caption text-mca-hint">
        Card counts and rarity mix for this trade.
      </p>
      <div className="mt-mca-md grid gap-mca-md sm:grid-cols-3">
        <div>
          <p className="text-mca-caption text-mca-ink-subtle">Your offer</p>
          <p className="text-mca-h3 text-mca-ink-strong">{yours.totalCards} cards</p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
            Sets: {yours.sets.length ? yours.sets.join(", ") : "—"}
          </p>
        </div>
        <div>
          <p className="text-mca-caption text-mca-ink-subtle">Their offer</p>
          <p className="text-mca-h3 text-mca-ink-strong">{theirs.totalCards} cards</p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
            Sets: {theirs.sets.length ? theirs.sets.join(", ") : "—"}
          </p>
        </div>
        <div>
          <p className="text-mca-caption text-mca-ink-subtle">Combined</p>
          <p className="text-mca-h3 text-mca-ink-strong">{combined.totalCards} cards</p>
          <ul className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
            {Object.entries(combined.rarityCounts).map(([r, n]) => (
              <li key={r}>
                {r}: {n}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
});
