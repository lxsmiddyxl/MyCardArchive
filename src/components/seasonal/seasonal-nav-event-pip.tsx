"use client";

import { listActiveSeasonalEvents } from "@/lib/events/seasonal-events";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Optional nav hint when a seasonal window is open (hydrates after mount). */
export function SeasonalNavEventPip() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(listActiveSeasonalEvents().length > 0);
  }, []);

  if (!active) return null;

  return (
    <Link
      href="/scan"
      className="hidden shrink-0 items-center rounded-full border border-mca-accent-strong/30 bg-mca-accent-border/15 px-mca-xs py-mca-trace text-mca-caption text-mca-ink-body transition hover:border-mca-accent-strong/50 lg:inline-flex"
      title="Seasonal event is live"
      aria-label="Seasonal event is live — go to Scan"
    >
      <span aria-hidden>🎗</span>
    </Link>
  );
}
