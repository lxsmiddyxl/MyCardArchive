"use client";

import { UserBadge } from "@/components/badges/user-badge";
import type { UserBadgeRow } from "@/lib/badges/types";
import { sortBadgeRowsForDisplay } from "@/lib/badges/badge-meta";
import { cn } from "@/lib/ui/cn";

export function UserBadgeList({
  badges,
  className,
}: {
  badges: UserBadgeRow[] | null | undefined;
  className?: string;
}) {
  const list = sortBadgeRowsForDisplay(badges ?? []);
  if (list.length === 0) {
    return (
      <p className="text-mca-caption text-mca-ink-muted">
        No badges yet — keep scanning and stay subscribed to earn more.
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
      {list.map((row) => (
        <li
          key={row.id ?? `${row.badge_type}-${row.badge_key}`}
          className="flex min-h-[4.5rem] items-center justify-center rounded-mca-control border border-mca-border/70 bg-mca-surface/50 p-mca-sm shadow-inner"
        >
          <UserBadge row={row} variant="full" />
        </li>
      ))}
    </ul>
  );
}
