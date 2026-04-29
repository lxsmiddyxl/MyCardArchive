import { cn } from "@/lib/ui/cn";

export type SkeletonLineProps = {
  className?: string;
};

/** Shimmer block; pass Tailwind width/height via className. */
export function SkeletonLine({ className }: SkeletonLineProps) {
  return (
    <span
      className={cn("block rounded-mca-block mca-skeleton-shimmer", className)}
      aria-hidden
    />
  );
}

export function TradeListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-mca-sm" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-mca-sm rounded-mca-card border border-mca-border/50 bg-mca-surface-elevated/30 p-mca-md transition-all duration-200 ease-mca-standard sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1 space-y-mca-xs">
            <SkeletonLine className="h-3 w-28" />
            <SkeletonLine className="h-4 w-full max-w-lg" />
            <SkeletonLine className="h-3 w-40" />
          </div>
          <div className="flex flex-col items-end gap-mca-xs sm:shrink-0">
            <SkeletonLine className="h-5 w-24 rounded-full" />
            <SkeletonLine className="h-6 w-20 rounded-mca-control" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-mca-border/80" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-mca-block py-mca-md">
          <div className="space-y-mca-xs px-mca-sm">
            <SkeletonLine className="h-4 w-2/3 max-w-md" />
            <SkeletonLine className="h-3 w-full max-w-xl" />
            <div className="mt-mca-xs flex justify-between gap-mca-sm">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-7 w-20 rounded-mca-control" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ActivityLogSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-mca-border/80" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="py-mca-md">
          <div className="space-y-mca-xs">
            <SkeletonLine className="h-3 w-36" />
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="mt-mca-sm h-16 w-full rounded-mca-block" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MatchCardCompactSkeleton() {
  return (
    <div
      className="rounded-mca-card border border-mca-border/50 bg-mca-surface-elevated/30 p-mca-md"
      aria-hidden
    >
      <div className="flex flex-col gap-mca-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-mca-xs">
          <SkeletonLine className="h-3 w-44" />
          <SkeletonLine className="h-4 w-full max-w-sm" />
        </div>
        <div className="flex shrink-0 gap-mca-sm">
          <SkeletonLine className="h-8 w-24 rounded-mca-control" />
          <SkeletonLine className="h-8 w-24 rounded-mca-control" />
        </div>
      </div>
    </div>
  );
}

export function DiscoveryFeedSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <ul className="mt-mca-md space-y-mca-md" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <MatchCardCompactSkeleton />
        </li>
      ))}
    </ul>
  );
}
