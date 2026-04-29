"use client";

import { getCachedFlairMeta } from "@/lib/flair/flair-meta";
import { TooltipSurface } from "@/mca-ui/tooltip-surface";
import { cn } from "@/lib/ui/cn";

function FlairChip({ flairKey, className }: { flairKey: string; className?: string }) {
  const k = flairKey.trim();
  if (!k) return null;
  const meta = getCachedFlairMeta(k);
  if (!meta) return null;
  const label = meta.displayName;
  const tip = meta.description;
  return (
    <span className={cn("group relative inline-flex shrink-0", className)}>
      <span
        className="inline-flex h-7 min-w-[1.75rem] cursor-default items-center justify-center rounded-full border border-mca-border/70 bg-mca-surface-elevated/80 px-mca-xs text-sm leading-none shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface motion-reduce:transition-none"
        tabIndex={0}
        role="img"
        aria-label={`${label}. ${tip}`}
      >
        <span aria-hidden="true">{meta.iconGlyph}</span>
      </span>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-mca-xs w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 opacity-0 transition-opacity duration-200 ease-mca-standard group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
        role="tooltip"
      >
        <TooltipSurface className="pointer-events-none text-xs leading-snug text-mca-ink-body">
          <p className="font-semibold text-mca-ink-strong">{label}</p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">{tip}</p>
        </TooltipSurface>
      </span>
    </span>
  );
}

export function InlineUserFlair({
  flairKey,
  secondaryFlairKey,
  className,
}: {
  flairKey?: string | null;
  /** Second non-seasonal flair (play, value, trade, mastery, etc.). */
  secondaryFlairKey?: string | null;
  className?: string;
}) {
  const primary = flairKey?.trim() ?? "";
  const secondary = secondaryFlairKey?.trim() ?? "";
  const keys = [primary, secondary === primary ? "" : secondary].filter(Boolean);
  if (keys.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-mca-xs", className)}>
      {keys.map((k) => (
        <FlairChip key={k} flairKey={k} />
      ))}
    </span>
  );
}
