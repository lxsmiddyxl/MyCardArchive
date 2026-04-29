"use client";

import { TierEmblem } from "@/components/tier/tier-emblem";
import { cn } from "@/lib/ui/cn";

const SLOT = "inline-flex h-7 w-[3.75rem] shrink-0 items-center justify-start align-middle";

export type TierBadgeInlineProps = {
  tierSlug?: string | null;
  className?: string;
  /**
   * When true and `tierSlug` is empty, render an invisible same-width slot so dense lists
   * stay aligned when some authors have a tier and others do not.
   */
  reserveSlot?: boolean;
};

/** Compact tier strip for inline author rows (social feed, comments, lists). */
export function TierBadgeInline({ tierSlug, className, reserveSlot = false }: TierBadgeInlineProps) {
  const s = tierSlug?.trim();
  if (!s) {
    if (!reserveSlot) return null;
    return <span className={cn(SLOT, className)} aria-hidden />;
  }
  return (
    <span className={cn(SLOT, className)}>
      <TierEmblem tierSlug={s} variant="compact" />
    </span>
  );
}
