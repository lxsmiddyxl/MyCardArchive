"use client";

import { AnimatedNumber } from "@/mca-ui/animated-number";

export function AchievementsUnlockSummary({
  unlocked,
  total,
}: {
  unlocked: number;
  total: number;
}) {
  return (
    <div className="mca-section-reveal mca-section-reveal-delay-1 shrink-0 rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 px-mca-lg py-mca-base text-center shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Unlocked
      </p>
      <p className="mt-mca-sm text-3xl font-semibold tabular-nums text-mca-accent transition-opacity duration-200 ease-out">
        <AnimatedNumber value={unlocked} className="tabular-nums" />
        <span className="text-lg font-normal text-mca-ink-subtle"> / {total}</span>
      </p>
    </div>
  );
}
