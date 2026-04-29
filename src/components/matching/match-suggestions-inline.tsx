"use client";

import { Button } from "@/mca-ui/button";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import { Panel } from "@/mca-ui/panel";
import { cn } from "@/lib/ui/cn";
import { useMicroFlash } from "@/lib/ui/use-micro-flash";
import { fetchTopMatches } from "@/lib/matching/client-api";
import { MATCHING_INDEX_REFETCH_DEBOUNCE_MS } from "@/lib/matching/realtime";
import type { UserMatch } from "@/lib/matching/types";
import {
  devtoolsDebounceArm,
  devtoolsDebounceClear,
  devtoolsDebounceFire,
  devtoolsSilentRefetch,
} from "@/lib/dev/realtime-devtools-state";
import { log } from "@/lib/logging/log";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { getRealtimePostgresClient, subscribeToMatchingIndex } from "@/lib/realtime/channels";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function shortUserId(id: string): string {
  return id.replace(/-/g, "").slice(-8);
}

export type MatchSuggestionsInlineProps = {
  title: string;
  description?: string;
  limit: number;
  /** When set, show a primary action per row (e.g. trade flow). */
  onPickUserId?: (userId: string) => void;
  pickLabel?: string;
  showViewAllLink?: boolean;
  /** `panel` matches trade screens; `section` matches dashboard cards. */
  container?: "panel" | "section";
  className?: string;
};

export function MatchSuggestionsInline({
  title,
  description,
  limit,
  onPickUserId,
  pickLabel = "Use",
  showViewAllLink = false,
  container = "panel",
  className,
}: MatchSuggestionsInlineProps) {
  const [matches, setMatches] = useState<UserMatch[] | null>(null);
  const aliveRef = useRef(true);
  const { active: inlineFlash, trigger: triggerInlineFlash } = useMicroFlash(200);
  const triggerInlineRef = useRef(triggerInlineFlash);
  triggerInlineRef.current = triggerInlineFlash;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refetchMatches = useCallback(async () => {
    const res = await fetchTopMatches(limit);
    if (!aliveRef.current) return;
    if (!res.ok) {
      setMatches([]);
      return;
    }
    setMatches(res.matches);
  }, [limit]);

  const refetchMatchesRef = useRef(refetchMatches);
  refetchMatchesRef.current = refetchMatches;

  useEffect(() => {
    void refetchMatches();
  }, [refetchMatches]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefetch = () => {
      clearTimeout(debounceTimer);
      devtoolsDebounceClear("matching-inline");
      devtoolsDebounceArm("matching-inline", "matching-inline", MATCHING_INDEX_REFETCH_DEBOUNCE_MS);
      debounceTimer = setTimeout(() => {
        devtoolsDebounceFire("matching-inline");
        devtoolsSilentRefetch("matching-inline");
        log.matching.debug("index.silent_reload", { source: "matching-inline" });
        void (async () => {
          await refetchMatchesRef.current();
          if (!cancelled) triggerInlineRef.current();
        })();
      }, MATCHING_INDEX_REFETCH_DEBOUNCE_MS);
    };

    void (async () => {
      const {
        data: { user },
      } = await getRealtimePostgresClient().auth.getUser();
      if (cancelled || !user) return;
      unsub = subscribeToMatchingIndex(user.id, scheduleRefetch);
    })();

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      devtoolsDebounceClear("matching-inline");
      unsub?.();
    };
  }, []);

  if (matches === null) {
    const inner = (
      <div className="flex items-center gap-mca-sm text-mca-body text-mca-ink-subtle">
        <LoadingSpinner className="size-4 text-mca-success-bold/80" />
        <span className="text-sm">Loading…</span>
      </div>
    );
    if (container === "section") {
      return (
        <section
          className={cn(
            "rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 p-mca-lg transition-[box-shadow] duration-200 ease-mca-standard dark:border-mca-border-subtle",
            inlineFlash && "ring-1 ring-mca-focus/15 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.06)]",
            className
          )}
        >
          {inner}
        </section>
      );
    }
    return (
      <Panel
        className={cn(
          "border-mca-border/80 bg-mca-surface/30 p-mca-md transition-[box-shadow] duration-200 ease-mca-standard",
          inlineFlash && "ring-1 ring-mca-focus/15 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.06)]",
          className
        )}
      >
        {inner}
      </Panel>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-mca-compact">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle">{title}</h2>
        {description ? (
          <p className="mt-mca-xs text-xs leading-relaxed text-mca-ink-subtle">{description}</p>
        ) : null}
      </div>
      {showViewAllLink ? (
        <Link
          href="/matching"
          className="text-xs font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
        >
          View all
        </Link>
      ) : null}
    </div>
  );

  const list = (
    <ul className="mt-mca-base space-y-mca-sm">
      {matches.map((m) => (
        <li
          key={m.userId}
          className="flex flex-col gap-mca-sm rounded-mca-block border border-mca-border/90 bg-mca-surface/50 px-mca-compact py-mca-tight sm:flex-row sm:items-center sm:justify-between dark:border-mca-border-subtle/80"
        >
          <div className="min-w-0">
            <p className="font-mono text-xs text-mca-ink-subtle">Partner · {shortUserId(m.userId)}</p>
            <p className="mt-mca-trace text-xs text-mca-ink-muted">
              Score <span className="font-semibold text-mca-accent/95">{m.score}</span>
              <span className="text-mca-hint"> · </span>
              {m.overlapCount} overlapping card{m.overlapCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-mca-sm">
            {onPickUserId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  mcaLog.event(
                    "matching.suggestion.pick",
                    { score: m.score },
                    { componentName: "MatchSuggestionsInline", surfaceName: "matching" }
                  );
                  onPickUserId(m.userId);
                }}
              >
                {pickLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="tertiary"
              onClick={() => {
                void navigator.clipboard.writeText(m.userId);
                mcaLog.event(
                  "matching.suggestion.copy_id",
                  { score: m.score },
                  { componentName: "MatchSuggestionsInline", surfaceName: "matching" }
                );
              }}
            >
              Copy id
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );

  if (container === "section") {
    return (
      <section
        className={cn(
          "rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 p-mca-lg transition-[box-shadow] duration-200 ease-mca-standard dark:border-mca-border-subtle",
          inlineFlash && "ring-1 ring-mca-focus/15 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.06)]",
          className
        )}
      >
        {header}
        {list}
      </section>
    );
  }

  return (
    <Panel
      className={cn(
        "border-mca-border/60 bg-mca-surface/25 p-mca-md transition-[box-shadow] duration-200 ease-mca-standard",
        inlineFlash && "ring-1 ring-mca-focus/15 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.06)]",
        className
      )}
    >
      {header}
      {list}
    </Panel>
  );
}
