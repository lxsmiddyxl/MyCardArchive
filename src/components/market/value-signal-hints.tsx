"use client";

import type { ValueSignalV2Tone } from "@/lib/market/value-signals-v2";
import { cn } from "@/lib/ui/cn";

const TONE_LABEL: Record<ValueSignalV2Tone, string> = {
  high_interest: "High interest",
  steady: "Steady",
  low_activity: "Low activity",
};

const TONE_CLASS: Record<ValueSignalV2Tone, string> = {
  high_interest: "text-mca-success border-mca-success/40",
  steady: "text-mca-ink-body border-mca-border/70",
  low_activity: "text-mca-ink-muted border-mca-border/50",
};

export function ValueSignalHintBadge({ tone, className }: { tone: ValueSignalV2Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-mca-pill border px-mca-xs py-mca-2xs text-mca-caption font-medium",
        TONE_CLASS[tone],
        className
      )}
    >
      {TONE_LABEL[tone]}
    </span>
  );
}
