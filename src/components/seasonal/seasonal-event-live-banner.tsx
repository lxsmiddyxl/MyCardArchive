"use client";

import { listActiveSeasonalBannerLines } from "@/lib/events/seasonal-events";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Client-only banner so clock-based copy matches the browser after mount (no SSR mismatch). */
export function SeasonalEventLiveBannerScan() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    setLines(listActiveSeasonalBannerLines("scan"));
  }, []);

  if (lines.length === 0) return null;

  return (
    <Panel className="border border-mca-accent-strong/25 bg-mca-accent-border/10 px-mca-md py-mca-sm shadow-inner">
      <ul className="space-y-mca-xs text-sm text-mca-ink-body">
        {lines.map((line) => (
          <li key={line} className="flex flex-wrap items-baseline gap-mca-xs">
            <span aria-hidden>🎗</span>
            <span>{line}</span>
            <Link
              href="/community"
              className="text-mca-caption font-semibold text-mca-accent-strong/90 underline-offset-2 hover:underline"
            >
              Community
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function SeasonalEventLiveBannerTier({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <Panel className="border border-mca-accent-strong/25 bg-mca-accent-border/10 px-mca-md py-mca-sm shadow-inner">
      <ul className="space-y-mca-xs text-sm text-mca-ink-body">
        {lines.map((line) => (
          <li key={line} className="flex flex-wrap items-baseline gap-mca-xs">
            <span aria-hidden>🎗</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
