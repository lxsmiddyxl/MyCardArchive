"use client";

import { getCachedFlairMeta } from "@/lib/flair/flair-meta";
import { sortEarnedFlairKeys } from "@/lib/flair/compute-user-flairs";
import { TooltipSurface } from "@/mca-ui/tooltip-surface";
import { cn } from "@/lib/ui/cn";

export function UserFlairList({
  flairKeys,
  className,
}: {
  flairKeys: string[] | null | undefined;
  className?: string;
}) {
  const sorted = sortEarnedFlairKeys(flairKeys ?? []);
  if (sorted.length === 0) {
    return (
      <p className="text-mca-caption text-mca-ink-muted">
        No flair yet — stay active in the community and keep your streak to unlock collector flairs.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-mca-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        className
      )}
    >
      {sorted.map((key) => {
        const meta = getCachedFlairMeta(key);
        if (!meta) return null;
        return (
          <li
            key={key}
            className="group relative flex min-h-[4.5rem] flex-col items-center justify-center gap-mca-xs rounded-mca-control border border-mca-border/70 bg-mca-surface/50 p-mca-sm text-center shadow-inner"
          >
            <span
              className="text-2xl leading-none"
              aria-hidden="true"
            >
              {meta.iconGlyph}
            </span>
            <span
              tabIndex={0}
              role="img"
              aria-label={`${meta.displayName}. ${meta.description}`}
              className="text-mca-caption font-semibold text-mca-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/50"
            >
              {meta.displayName}
            </span>
            <span
              className="pointer-events-none absolute left-1/2 top-full z-20 mt-mca-xs hidden w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 group-focus-within:block group-hover:block"
              role="tooltip"
            >
              <TooltipSurface className="pointer-events-none text-xs leading-snug text-mca-ink-body">
                <p className="font-semibold text-mca-ink-strong">{meta.displayName}</p>
                <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">{meta.description}</p>
              </TooltipSurface>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
