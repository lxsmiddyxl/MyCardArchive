"use client";

import { mergeLastSurfacesJson } from "@/lib/retention/last-surface-memory";
import { retentionSummary } from "@/lib/retention/recent-activity-hints";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mca:last:surfaces:v1";

/**
 * Soft retention strip: last binder/deck + draft reminder (Phase 62).
 */
export function RetentionHintsStrip() {
  const pathname = usePathname();
  const [binderId, setBinderId] = useState<string | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [draftNudge, setDraftNudge] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const o = JSON.parse(raw ?? "{}") as { binderId?: string; deckId?: string };
      setBinderId(typeof o.binderId === "string" ? o.binderId : null);
      setDeckId(typeof o.deckId === "string" ? o.deckId : null);
    } catch {
      setBinderId(null);
      setDeckId(null);
    }
  }, [pathname]);

  useEffect(() => {
    const m = /^\/binders\/([^/]+)\/?$/.exec(pathname);
    if (m?.[1] && !m[1].includes("create")) {
      try {
        const next = mergeLastSurfacesJson(window.localStorage.getItem(STORAGE_KEY), { binderId: m[1] });
        window.localStorage.setItem(STORAGE_KEY, next);
        setBinderId(m[1]);
      } catch {
        /* */
      }
    }
    const d = /^\/decks\/([^/]+)\/?$/.exec(pathname);
    if (d?.[1]) {
      try {
        const next = mergeLastSurfacesJson(window.localStorage.getItem(STORAGE_KEY), { deckId: d[1] });
        window.localStorage.setItem(STORAGE_KEY, next);
        setDeckId(d[1]);
      } catch {
        /* */
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/trades" && pathname !== "/welcome") return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/trades/list?limit=30", { credentials: "include" });
        if (!r.ok) return;
        const j = (await r.json()) as { success?: boolean; trades?: { status?: string }[] };
        const trades = Array.isArray(j.trades) ? j.trades : [];
        const drafts = trades.filter((t) => t.status === "draft").length;
        if (!cancelled) setDraftNudge(drafts > 0);
      } catch {
        if (!cancelled) setDraftNudge(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const summary = retentionSummary({
    draftTradeNudge: draftNudge,
    last: { binderId, deckId },
  });
  if (!summary && !binderId && !deckId && !draftNudge) return null;

  return (
    <Panel className="mb-mca-md border border-mca-border-subtle bg-mca-surface-elevated/60 p-mca-md">
      <div className="flex flex-col gap-mca-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-mca-ink-body">{summary}</p>
        <div className="flex flex-wrap gap-mca-compact">
          {binderId ? (
            <Link
              href={`/binders/${binderId}`}
              className={cn(
                "inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-[transform,background-color,border-color] duration-200 ease-mca-standard hover:bg-mca-border-subtle active:scale-[0.98]"
              )}
            >
              Last binder
            </Link>
          ) : null}
          {deckId ? (
            <Link
              href={`/decks/${deckId}`}
              className={cn(
                "inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-[transform,background-color,border-color] duration-200 ease-mca-standard hover:bg-mca-border-subtle active:scale-[0.98]"
              )}
            >
              Last deck
            </Link>
          ) : null}
          {draftNudge ? (
            <Link
              href="/trades"
              className={cn(
                "inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-[transform,background-color] duration-200 ease-mca-standard hover:bg-mca-accent/95 active:scale-[0.98]"
              )}
            >
              Review trades
            </Link>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
