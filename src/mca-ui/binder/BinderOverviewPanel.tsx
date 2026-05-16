"use client";

import { resolveBinderAccent, type BinderAccent } from "@/lib/binders/binder-accent";
import { MCA_MOTION_PANEL } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import { MetricBlock, MetricGrid } from "@/mca-ui/metric-block";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import type { BinderInsightsOverview } from "@/mca-utils/binders/binder-insights-types";

export type BinderOverviewPanelProps = {
  overview: BinderInsightsOverview;
  accent?: BinderAccent;
  className?: string;
};

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function BinderOverviewPanel({
  overview,
  accent: accentProp,
  className,
}: BinderOverviewPanelProps) {
  const accent = accentProp ?? resolveBinderAccent(overview.binder_id);
  const binderId = overview.binder_id;

  return (
    <Panel
      className={cn(
        "space-y-mca-md border",
        accent.borderClass,
        accent.surfaceClass,
        MCA_MOTION_PANEL,
        className
      )}
      style={{ borderColor: `${accent.color}44` }}
    >
      <header className="flex flex-col gap-mca-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-mca-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-mca-border/60"
              style={{ backgroundColor: accent.color }}
              aria-hidden
            />
            <h2 className="truncate text-lg font-semibold text-mca-ink-strong">
              {overview.name}
            </h2>
          </div>
          {overview.description ? (
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              {overview.description}
            </p>
          ) : null}
          <p className="mt-mca-xs text-xs text-mca-ink-subtle">
            Last updated{" "}
            <span className="font-medium text-mca-ink-body">
              {formatUpdatedAt(overview.updated_at)}
            </span>
          </p>
        </div>
      </header>

      <MetricGrid>
        <MetricBlock label="Total cards">
          <p className="mt-mca-xs text-2xl font-semibold tabular-nums text-mca-ink-strong">
            {overview.total_cards}
          </p>
        </MetricBlock>
        <MetricBlock label="Unique cards">
          <p className="mt-mca-xs text-2xl font-semibold tabular-nums text-mca-ink-strong">
            {overview.unique_catalog_cards}
          </p>
        </MetricBlock>
        <MetricBlock label="Sets represented">
          <p className="mt-mca-xs text-2xl font-semibold tabular-nums text-mca-ink-strong">
            {overview.sets_represented}
          </p>
        </MetricBlock>
      </MetricGrid>

      <div className="flex flex-wrap gap-mca-sm">
        <Link
          href={`/binders/${binderId}/add-card`}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent shadow-mca-panel transition duration-200 ease-mca-standard hover:bg-mca-accent/95"
        >
          Add card
        </Link>
        <Link
          href="/scan"
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
        >
          Scan card
        </Link>
        <Link
          href={`/binders/${binderId}/missing`}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
        >
          View missing cards
        </Link>
        <Link
          href={`/binders/${binderId}/analytics`}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-body transition duration-200 ease-mca-standard hover:bg-mca-chrome/80"
        >
          View history
        </Link>
      </div>
    </Panel>
  );
}
