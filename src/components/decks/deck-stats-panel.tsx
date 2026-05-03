"use client";

import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import type { DeckRowForAnalytics } from "@/lib/decks/deck-analytics";
import {
  buildCurveHistogram,
  buildTypeBreakdown,
} from "@/lib/decks/deck-analytics";
import type { DeckStatsRow } from "@/lib/decks/editor-types";
import { useCallback } from "react";

const COLOR_DOT: Record<string, string> = {
  grass: "bg-mca-success-bold",
  fire: "bg-orange-500",
  water: "bg-mca-type-water",
  lightning: "bg-yellow-400",
  psychic: "bg-mca-type-psychic",
  fighting: "bg-orange-700",
  darkness: "bg-mca-chrome",
  metal: "bg-slate-400",
  fairy: "bg-pink-400",
  dragon: "bg-indigo-500",
  colorless: "bg-mca-border-light",
  normal: "bg-mca-ink-muted",
};

type Props = {
  deckId: string;
  deckName: string;
  stats: DeckStatsRow | null;
  analyticsRows: DeckRowForAnalytics[];
  tierSlug: string;
  onStatsRefreshed: () => void;
  className?: string;
};

export function DeckStatsPanel({
  deckId,
  deckName,
  stats,
  analyticsRows,
  tierSlug,
  onStatsRefreshed,
  className,
}: Props) {
  const { run: runRecalc, loading: recalcBusy, error: recalcErr } = useAsyncState<null>();

  const canRecalc =
    tierSlug.toLowerCase() === "pro" ||
    tierSlug.toLowerCase() === "elite";

  const curve = buildCurveHistogram(analyticsRows);
  const maxCurve = Math.max(1, ...curve);
  const types = buildTypeBreakdown(analyticsRows);

  const recalc = useCallback(async () => {
    await runRecalc(async () => {
      const s = await fetchJson<Record<string, unknown>>("/api/decks/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck_id: deckId }),
      });
      if (s.kind !== "ok") throw new Error(fetchJsonErrorMessage(s) || "Stats failed.");
      const syn = await fetchJson<Record<string, unknown>>("/api/decks/synergy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck_id: deckId }),
      });
      if (syn.kind !== "ok") throw new Error(fetchJsonErrorMessage(syn) || "Synergy failed.");
      onStatsRefreshed();
      return null;
    });
  }, [deckId, onStatsRefreshed, runRecalc]);

  const synergy = stats?.synergy_score ?? 0;
  const busy = recalcBusy;
  const err = recalcErr;

  return (
    <aside
      aria-live="polite"
      aria-busy={busy}
      className={`flex flex-col gap-mca-base rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-base shadow-mca-panel lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto dark:border-mca-border-subtle ${className ?? ""}`}
    >
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Stats
        </h2>
        <p className="mt-mca-sm truncate text-xs text-mca-ink-subtle" title={deckName}>
          {deckName}
        </p>
      </div>

      {err ? (
        <p className="rounded-mca-block border border-red-900/50 bg-red-950/30 px-mca-sm py-mca-micro text-xs text-red-200">
          {err}
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-mca-compact">
        <div className="rounded-mca-block border border-mca-border bg-mca-surface/50 p-mca-compact shadow-mca-panel dark:border-mca-border-subtle">
          <p className="text-[10px] uppercase tracking-wide text-mca-ink-subtle">Total</p>
          <p className="text-xl font-semibold tabular-nums text-mca-ink-strong">
            {stats?.total_cards ?? 0}
          </p>
        </div>
        <div className="rounded-mca-block border border-mca-border bg-mca-surface/50 p-mca-compact shadow-mca-panel dark:border-mca-border-subtle">
          <p className="text-[10px] uppercase tracking-wide text-mca-ink-subtle">Unique</p>
          <p className="text-xl font-semibold tabular-nums text-mca-ink-strong">
            {stats?.unique_cards ?? 0}
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-mca-compact text-sm font-semibold text-mca-ink-body">
          Type tags
        </h3>
        <div className="flex flex-wrap gap-mca-micro">
          {(stats?.color_identity ?? []).length === 0 ? (
            <span className="text-xs text-mca-hint">—</span>
          ) : (
            (stats?.color_identity ?? []).map((c) => (
              <span
                key={c}
                title={c}
                className={`h-6 w-6 rounded-full border border-mca-border-subtle shadow-inner ${
                  COLOR_DOT[c.toLowerCase()] ?? "bg-mca-neutral-dot"
                }`}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-mca-compact text-sm font-semibold text-mca-ink-body">
          Role curve (Pokémon-style)
        </h3>
        <p className="mb-mca-sm text-[10px] text-mca-hint">
          Buckets by supertype / evolution — not Energy costs.
        </p>
        <div className="flex h-28 items-end gap-mca-xs">
          {curve.map((n, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-end gap-mca-xs"
            >
              <div
                className="w-full min-h-[2px] rounded-t bg-gradient-to-t from-mca-accent-deep/80 to-mca-accent/90 transition-all duration-300"
                style={{ height: `${(n / maxCurve) * 100}%` }}
                title={`${n} cards`}
              />
              <span className="text-[9px] text-mca-hint">{i}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-mca-compact text-sm font-semibold text-mca-ink-body">
          Type breakdown
        </h3>
        <ul className="space-y-mca-sm">
          {types.length === 0 ? (
            <li className="text-xs text-mca-hint">No data</li>
          ) : (
            types.map((t) => (
              <li
                key={t.label}
                className="flex items-center justify-between gap-mca-sm text-xs"
              >
                <span className="truncate text-mca-ink-body">{t.label}</span>
                <span className="shrink-0 tabular-nums text-mca-ink-subtle">
                  {t.pct}% · {t.count}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <div className="flex items-end justify-between gap-mca-sm">
          <div>
            <h3 className="text-sm font-semibold text-mca-ink-body">Synergy</h3>
            <p className="text-3xl font-bold tabular-nums text-mca-accent">
              {synergy}
            </p>
          </div>
        </div>
        <div
          className="mt-mca-sm h-2 overflow-hidden rounded-full bg-mca-chrome"
          role="meter"
          aria-valuenow={synergy}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-mca-accent-deep to-mca-accent transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, synergy))}%` }}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-mca-sm text-sm font-semibold text-mca-ink-body">
          Legality
        </h3>
        <span className="inline-flex rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-sm py-mca-xs text-xs capitalize text-mca-ink-soft">
          {stats?.legality_status ?? "—"}
        </span>
      </section>

      {canRecalc ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void recalc()}
          className="rounded-mca-control border border-mca-accent-strong/40 bg-mca-accent-strong/10 px-mca-compact py-mca-sm text-sm font-semibold text-mca-nav-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent-strong/20 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? "Recalculating…" : "Recalculate stats"}
        </button>
      ) : (
        <p className="text-[10px] text-mca-hint">
          Recalculate stats is available on{" "}
          <span className="text-mca-ink-muted">Pro</span> or{" "}
          <span className="text-mca-ink-muted">Elite</span>.
        </p>
      )}
    </aside>
  );
}
