"use client";

import { JourneyProgressCard } from "@/components/journeys/journey-progress-card";
import type { JourneyProfileRow } from "@/lib/journeys/journey-catalog";
import { cn } from "@/lib/ui/cn";

export function JourneyList({
  active,
  completed,
  className,
}: {
  active: JourneyProfileRow[];
  completed: JourneyProfileRow[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-mca-lg", className)}>
      <section>
        <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Active journeys
        </h3>
        {active.length === 0 ? (
          <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">No active journeys — you are on top of every path.</p>
        ) : (
          <ul className="mt-mca-md space-y-mca-sm">
            {active.map((row) => (
              <li key={row.journeyId}>
                <JourneyProgressCard row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Completed journeys
        </h3>
        {completed.length === 0 ? (
          <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">Complete a journey to see it listed here.</p>
        ) : (
          <ul className="mt-mca-md space-y-mca-sm">
            {completed.map((row) => (
              <li key={row.journeyId}>
                <JourneyProgressCard row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
