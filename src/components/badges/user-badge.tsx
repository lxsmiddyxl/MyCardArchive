"use client";

import { TierEmblem } from "@/components/tier/tier-emblem";
import { getCachedBadgeMeta } from "@/lib/badges/badge-meta";
import type { UserBadgeRow } from "@/lib/badges/types";
import { cn } from "@/lib/ui/cn";
import { TooltipSurface } from "@/mca-ui/tooltip-surface";

export type { UserBadgeRow } from "@/lib/badges/types";

function ScanMilestoneGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" className="stroke-mca-accent-strong/55" strokeWidth="1.25" />
      <path
        d="M6.25 10.25 8.75 12.75 13.75 7.25"
        className="stroke-mca-accent-strong"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SeasonalSpringGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 3v14M6 7c2-1 4-1 6 0M6 11c2 1 4 1 6 0"
        className="stroke-mca-accent-strong/80"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <circle cx="10" cy="5" r="1.35" className="fill-mca-accent-strong/70" />
    </svg>
  );
}

function SeasonalSummerGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3.25" className="stroke-mca-warning-tint/90" strokeWidth="1.35" />
      <path
        d="M10 2v2m0 12v2m8-6h-2M4 10H2m13.66-5.66-1.42 1.42M5.76 14.24l-1.42 1.42m11.32-1.42-1.42-1.42M5.76 5.76L4.34 4.34"
        className="stroke-mca-warning-tint/70"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SeasonalHolidayGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M10 4v3" className="stroke-mca-accent-strong/75" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M6 9h8l-1 8H7l-1-8z"
        className="stroke-mca-accent-strong/65"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7" r="1" className="fill-mca-warning-tint/90" />
    </svg>
  );
}

function seasonalGlyphForKey(badgeKey: string, className?: string) {
  switch (badgeKey) {
    case "spring_2026_collector":
      return <SeasonalSpringGlyph className={className} />;
    case "summer_2026_scan_sprint":
      return <SeasonalSummerGlyph className={className} />;
    case "holiday_2026_collector":
      return <SeasonalHolidayGlyph className={className} />;
    default:
      return <SeasonalSpringGlyph className={className} />;
  }
}

function PlayIdentityGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="4.5"
        width="13"
        height="11"
        rx="1.25"
        className="stroke-mca-accent-strong/60"
        strokeWidth="1.2"
      />
      <path
        d="M7 8h6M7 11h4"
        className="stroke-mca-warning-tint/90"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TradeReputationGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6.5 8.5c1-1.75 3.25-2.75 5.25-2.25 1.35.35 2.45 1.35 3 2.65"
        className="stroke-mca-accent-strong/70"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M4 12.5 7 9.5l2.25 2.25L14.5 6.25"
        className="stroke-mca-warning-tint"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 14.25c1.1-.35 2.05-1.1 2.75-2.1"
        className="stroke-mca-accent-strong/55"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FandomBadgeGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 3.2 12.2 7.5 17 8.2 13.6 11.4 14.4 16 10 13.7 5.6 16 6.4 11.4 3 8.2 7.8 7.5Z"
        className="stroke-mca-warning-tint/90"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9.25" r="1.2" className="fill-mca-accent-strong/70" />
    </svg>
  );
}

function CollectionValueGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 3 12.5 7.5 17.5 8.5 14 12.5 14.5 17.5 10 15.2 5.5 17.5 6 12.5 2.5 8.5 7.5 7.5Z"
        className="stroke-mca-warning-tint/90"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path d="M10 6.5v7" className="stroke-mca-accent-strong/60" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function CollectionMasteryGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="12" height="9" rx="1.25" className="stroke-mca-accent-strong/55" strokeWidth="1.2" />
      <rect x="6" y="7" width="8" height="5" rx="0.75" className="stroke-mca-warning-tint/85" strokeWidth="1.1" />
    </svg>
  );
}

function JourneyPathGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6.75" className="stroke-mca-accent-strong/50" strokeWidth="1.2" />
      <path
        d="M5.25 10.25 8.25 13.25 14.75 6.25"
        className="stroke-mca-accent-strong"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TenureGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="5.5"
        width="11"
        height="10"
        rx="1.25"
        className="stroke-mca-ink-muted"
        strokeWidth="1.2"
      />
      <path d="M7 3.5h6v2H7z" className="fill-mca-ink-muted/80" />
    </svg>
  );
}

export function UserBadge({
  row,
  variant = "full",
  className,
}: {
  row: UserBadgeRow;
  variant?: "compact" | "full";
  className?: string;
}) {
  const meta = getCachedBadgeMeta(row.badge_type, row.badge_key);
  const label = meta?.displayName ?? row.badge_key;
  const tip = meta?.description ?? row.badge_key;
  const compact = variant === "compact";

  const inner =
    row.badge_type === "tier" && meta?.tierSlugForEmblem ? (
      <TierEmblem tierSlug={meta.tierSlugForEmblem} variant="compact" showTooltip={false} />
    ) : row.badge_type === "tenure" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-mca-border-subtle bg-mca-chrome/50 text-mca-ink-muted",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <TenureGlyph className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
    ) : row.badge_type === "scan_milestone" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-mca-xs rounded-full border border-mca-accent-strong/30 bg-mca-accent-border/15 text-mca-warning-tint motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <ScanMilestoneGlyph className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        {!compact && meta?.shortLabel ? (
          <span className="text-mca-caption font-semibold tabular-nums">{meta.shortLabel}</span>
        ) : null}
      </span>
    ) : row.badge_type === "journey" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-mca-xs rounded-full border border-mca-accent-strong/35 bg-mca-accent-border/20 text-mca-warning-tint motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <JourneyPathGlyph className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        {!compact && meta?.shortLabel ? (
          <span className="text-mca-caption font-semibold tabular-nums">{meta.shortLabel}</span>
        ) : null}
      </span>
    ) : row.badge_type === "collection_mastery" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-mca-xs rounded-full border border-mca-accent-strong/40 bg-mca-accent-border/18 text-mca-ink-strong motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <CollectionMasteryGlyph className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        {!compact && meta?.shortLabel ? (
          <span className="text-mca-caption font-semibold tabular-nums">{meta.shortLabel}</span>
        ) : null}
      </span>
    ) : row.badge_type === "play_identity" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-mca-xs rounded-full border border-mca-accent-strong/36 bg-mca-accent-border/14 text-mca-ink-strong motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <PlayIdentityGlyph className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        {!compact && meta?.shortLabel ? (
          <span className="text-mca-caption font-semibold tabular-nums">{meta.shortLabel}</span>
        ) : null}
      </span>
    ) : row.badge_type === "trade_reputation" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-mca-xs rounded-full border border-mca-accent-strong/38 bg-mca-accent-border/16 text-mca-warning-tint motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <TradeReputationGlyph className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        {!compact && meta?.shortLabel ? (
          <span className="text-mca-caption font-semibold tabular-nums">{meta.shortLabel}</span>
        ) : null}
      </span>
    ) : row.badge_type === "collection_value" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-mca-xs rounded-full border border-mca-accent-strong/34 bg-mca-accent-border/14 text-mca-ink-strong motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <CollectionValueGlyph className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        {!compact && meta?.shortLabel ? (
          <span className="text-mca-caption font-semibold tabular-nums">{meta.shortLabel}</span>
        ) : null}
      </span>
    ) : row.badge_type === "fandom" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-mca-xs rounded-full border border-mca-accent-strong/32 bg-mca-accent-border/12 text-mca-warning-tint motion-safe:transition motion-safe:duration-200 motion-safe:ease-mca-standard",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        <FandomBadgeGlyph className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        {!compact && meta?.shortLabel ? (
          <span className="text-mca-caption font-semibold tabular-nums">{meta.shortLabel}</span>
        ) : null}
      </span>
    ) : row.badge_type === "seasonal_event" ? (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-mca-accent-strong/25 bg-mca-accent-border/15 dark:border-mca-accent-strong/35 dark:bg-mca-accent-border/20",
          compact ? "h-7 min-w-[1.75rem] px-mca-xs" : "h-9 min-w-[2.25rem] px-mca-sm"
        )}
      >
        {seasonalGlyphForKey(row.badge_key, compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0")}
      </span>
    ) : (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-mca-border bg-mca-chrome/60 text-mca-caption text-mca-ink-muted",
          compact ? "h-7 px-mca-xs" : "h-9 px-mca-sm"
        )}
        aria-hidden
      >
        ?
      </span>
    );

  return (
    <span className={cn("group relative inline-flex shrink-0", className)}>
      <span
        className="inline-flex cursor-default outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface rounded-full"
        tabIndex={0}
        role="img"
        aria-label={`${label}. ${tip}`}
      >
        {inner}
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
