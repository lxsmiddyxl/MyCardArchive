"use client";

import type { YearInReviewJsonV1 } from "@/lib/seasons/summary-types";
import { formatUsdApproxFromCents } from "@/lib/value/value-identity-helpers";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function asDeckNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

function asTopMonths(raw: unknown): { month: number; label: string; count: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => m as Record<string, unknown>)
    .filter((m) => typeof m.month === "number" && typeof m.count === "number")
    .map((m) => ({
      month: Number(m.month),
      label: String(m.label ?? ""),
      count: Number(m.count),
    }));
}

export type YearInReviewClientProps = {
  initialYear: number;
  subjectUserId: string;
  viewerId: string | null;
};

export function YearInReviewClient({ initialYear, subjectUserId, viewerId }: YearInReviewClientProps) {
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<YearInReviewJsonV1 | null>(null);
  const [viewerIsSubject, setViewerIsSubject] = useState(false);
  const markedView = useRef(false);

  const yearOptions = useMemo(() => {
    const cur = new Date().getUTCFullYear();
    const set = new Set<number>();
    for (let d = 0; d < 8; d++) set.add(cur - d);
    set.add(year);
    set.add(initialYear);
    return [...set].sort((a, b) => b - a);
  }, [year, initialYear]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        year: String(year),
        userId: subjectUserId,
      });
      const res = await fetch(`/api/year-in-review?${qs.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as {
        summary?: YearInReviewJsonV1 | null;
        error?: string;
        viewerIsSubject?: boolean;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load");
      setSummary((body.summary ?? null) as YearInReviewJsonV1 | null);
      setViewerIsSubject(!!body.viewerIsSubject);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [subjectUserId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setYear(initialYear);
  }, [initialYear]);

  useEffect(() => {
    if (!viewerIsSubject || !viewerId || markedView.current) return;
    markedView.current = true;
    void fetch("/api/year-in-review/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
    });
  }, [viewerIsSubject, viewerId, year]);

  const decks = asDeckNames(summary?.topDeckNames);
  const months = asTopMonths(summary?.topMonths);
  const firsts = summary?.firsts ?? {};
  const evo = summary?.personaEvolution;

  return (
    <div className="mx-auto max-w-3xl space-y-mca-xl pb-mca-2xl">
      <header className="space-y-mca-sm">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Collector recap</p>
        <h1 className="text-3xl font-bold tracking-tight text-mca-ink-strong">Your year in cards</h1>
        <p className="max-w-2xl text-sm text-mca-ink-muted">
          Aggregates only — no exact timestamps, no financial claims. Sharing is manual: screenshot the summary
          card if you want to post it elsewhere.
        </p>
        <div className="flex flex-wrap items-center gap-mca-sm">
          <label className="text-mca-caption text-mca-ink-muted">
            Year{" "}
            <select
              className="ml-mca-xs rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-body"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {viewerIsSubject ? (
            <button
              type="button"
              className="rounded-mca-control border border-mca-border px-mca-sm py-mca-xs text-mca-caption text-mca-ink-body transition duration-200 ease-mca-standard hover:bg-mca-chrome/25"
              onClick={() =>
                void fetch("/api/year-in-review/refresh", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ year }),
                }).then(() => load())
              }
            >
              Regenerate
            </button>
          ) : null}
        </div>
      </header>

      {loading ? <p className="text-mca-body text-mca-ink-muted">Loading recap…</p> : null}
      {error ? (
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !summary ? (
        <Panel className="rounded-mca-card border-mca-border bg-mca-surface/40 p-mca-md">
          <p className="text-mca-body text-mca-ink-muted">
            No Year-in-Review has been generated for {year} yet. Keep collecting — it builds automatically after
            activity rolls into the new year (UTC), or tap Regenerate if you are the owner.
          </p>
        </Panel>
      ) : null}

      {summary ? (
        <div className="space-y-mca-lg motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-mca-standard">
          <Panel className="rounded-mca-card border-2 border-mca-accent-strong/35 bg-mca-surface-elevated/60 p-mca-lg shadow-mca-card">
            <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Shareable card</p>
            <p className="mt-mca-sm text-2xl font-bold text-mca-ink-strong">{summary.collectorTitle ?? "Collector"}</p>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">{summary.highlight}</p>
            <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">
              {summary.valueDisclaimer ?? "Approximate value — not audited."}
            </p>
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md">
            <h2 className="text-lg font-semibold text-mca-ink-strong">Activity</h2>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
              Total logged events:{" "}
              <span className="font-semibold tabular-nums text-mca-ink-body">{summary.totalActivities ?? 0}</span>
            </p>
            {months.length > 0 ? (
              <ul className="mt-mca-md space-y-mca-xs text-mca-caption text-mca-ink-body">
                {months.map((m) => (
                  <li key={m.month}>
                    Top month · {m.label || m.month}:{" "}
                    <span className="font-semibold tabular-nums">{m.count}</span> events
                  </li>
                ))}
              </ul>
            ) : null}
            {typeof summary.biggestStreak === "number" ? (
              <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
                Biggest streak logged:{" "}
                <span className="font-semibold tabular-nums">{summary.biggestStreak}</span> days
              </p>
            ) : null}
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md">
            <h2 className="text-lg font-semibold text-mca-ink-strong">Firsts (UTC dates)</h2>
            <ul className="mt-mca-sm list-inside list-disc text-mca-caption text-mca-ink-muted">
              {Object.entries(firsts).map(([k, v]) =>
                v ? (
                  <li key={k}>
                    {k}: {String(v)}
                  </li>
                ) : null
              )}
            </ul>
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md">
            <h2 className="text-lg font-semibold text-mca-ink-strong">Fandom spotlight</h2>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
              Pinned catalog keys only — no private card names.
            </p>
            <pre className="mt-mca-sm max-h-40 overflow-auto rounded-mca-control bg-mca-chrome/20 p-mca-sm text-[11px] text-mca-ink-muted">
              {JSON.stringify(summary.topFandomPins ?? {}, null, 2)}
            </pre>
          </Panel>

          {decks.length > 0 ? (
            <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md">
              <h2 className="text-lg font-semibold text-mca-ink-strong">Deck spotlight</h2>
              <ul className="mt-mca-sm list-inside list-disc text-mca-caption text-mca-ink-body">
                {decks.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md">
            <h2 className="text-lg font-semibold text-mca-ink-strong">Grail moments</h2>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
              Grail slots added this year (count):{" "}
              <span className="font-semibold tabular-nums">{summary.grailAddsInYear ?? 0}</span>
            </p>
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md">
            <h2 className="text-lg font-semibold text-mca-ink-strong">Value milestones</h2>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
              Refreshes logged: {summary.valueRefreshEvents ?? 0}
            </p>
            {summary.approxValueCentsEnd != null && summary.approxValueCentsEnd > 0 ? (
              <p className="mt-mca-sm text-mca-body text-mca-ink-body">
                Approximate collection value: {formatUsdApproxFromCents(Number(summary.approxValueCentsEnd))}
              </p>
            ) : null}
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md">
            <h2 className="text-lg font-semibold text-mca-ink-strong">Persona evolution</h2>
            <p className="mt-mca-xs text-sm text-mca-ink-muted">{evo?.note}</p>
            {evo?.endPersona?.trim() ? (
              <p className="mt-mca-sm text-mca-body text-mca-ink-body">{evo.endPersona.trim()}</p>
            ) : null}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
