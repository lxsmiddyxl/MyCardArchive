"use client";

import type { UserMatch } from "@/lib/matching/types";
import { useAppWidePresenceOptional } from "@/components/realtime/app-wide-presence";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Button } from "@/mca-ui/button";
import Link from "next/link";
import { memo, useCallback, useState } from "react";

function shortUserId(id: string): string {
  return id.replace(/-/g, "").slice(-8);
}

function previewLines(lines: UserMatch["matchingCards"], max: number): string {
  const parts = lines.slice(0, max).map((l) => {
    const label = l.name?.trim() || l.cardId.slice(0, 8);
    return `${label} ×${l.quantity}`;
  });
  const more = lines.length > max ? ` +${lines.length - max} more` : "";
  return parts.join(", ") + more;
}

export type MatchCardProps = {
  match: UserMatch;
  /** Compact rows hide long card lists; feed shows more overlap detail. */
  variant?: "compact" | "feed";
};

export const MatchCard = memo(function MatchCard({ match, variant = "compact" }: MatchCardProps) {
  const [copied, setCopied] = useState(false);
  const presence = useAppWidePresenceOptional();
  const partnerOnline = presence?.isUserOnline(match.userId) ?? false;
  const maxLines = variant === "feed" ? 6 : 2;

  const copyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(match.userId);
      setCopied(true);
      mcaLog.event(
        "matching.copy_partner_id",
        { score: match.score },
        { componentName: "MatchCard", surfaceName: "matching" }
      );
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [match.userId, match.score]);

  const give = previewLines(match.matchingCards, maxLines);
  const get = previewLines(match.reverseMatchingCards, maxLines);

  return (
    <div
      className={`rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-md transition-all duration-200 ease-mca-standard ${
        variant === "feed" ? "shadow-mca-panel shadow-black/20" : "hover:border-mca-field-border hover:bg-mca-chrome/30"
      }`}
    >
      <div className="flex flex-col gap-mca-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-mca-sm">
            <p className="font-mono text-mca-caption text-mca-ink-subtle">Partner · {shortUserId(match.userId)}</p>
            {partnerOnline ? (
              <span
                className="inline-flex items-center gap-mca-xs rounded-full border border-mca-accent-strong/25 bg-mca-accent-strong/10 px-mca-sm py-mca-trace text-mca-caption font-medium text-mca-accent/95"
                title="This user is currently online"
              >
                <span className="size-1.5 rounded-full bg-mca-accent/90" aria-hidden />
                Active trader
              </span>
            ) : null}
          </div>
          <p className="mt-mca-xs text-mca-body text-mca-ink-body">
            Score <span className="font-semibold text-mca-accent/95">{match.score}</span>
            <span className="text-mca-hint"> · </span>
            {match.overlapCount} overlapping card{match.overlapCount === 1 ? "" : "s"}
            {match.compatibilityScore != null ? (
              <>
                <span className="text-mca-hint"> · </span>
                Compatibility{" "}
                <span className="font-semibold text-mca-ink-muted">{match.compatibilityScore}</span>
                {match.tradePotential != null ? (
                  <>
                    <span className="text-mca-hint"> · </span>
                    Trade potential{" "}
                    <span className="font-semibold text-mca-ink-muted">
                      {Math.round(match.tradePotential * 10) / 10}
                    </span>
                  </>
                ) : null}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-mca-sm">
          <Button type="button" variant="tertiary" onClick={() => void copyId()}>
            {copied ? "Copied" : "Copy user id"}
          </Button>
          <Link
            href={`/trades/new?counterparty=${encodeURIComponent(match.userId)}`}
            onClick={() =>
              mcaLog.event(
                "matching.start_trade_click",
                { score: match.score },
                { componentName: "MatchCard", surfaceName: "matching" }
              )
            }
            className="inline-flex touch-manipulation items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-compact py-mca-micro text-xs font-semibold text-mca-on-accent outline-none transition-all duration-200 ease-mca-standard hover:bg-mca-accent/95 focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
          >
            New trade
          </Link>
        </div>
      </div>
      {match.matchingCards.length > 0 ? (
        <div className="mt-mca-md border-t border-mca-border/80 pt-mca-sm">
          <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-subtle">They want (you have)</p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">{give || "—"}</p>
        </div>
      ) : null}
      {match.reverseMatchingCards.length > 0 ? (
        <div className="mt-mca-md border-t border-mca-border/80 pt-mca-sm">
          <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-subtle">You want (they have)</p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">{get || "—"}</p>
        </div>
      ) : null}
    </div>
  );
});
