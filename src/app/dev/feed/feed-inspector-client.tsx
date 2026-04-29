"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type RankingMeta =
  | {
      version: "v3";
      hybrid: number;
      ml: number;
      heuristic: number;
      personalized: number;
      used_ml: boolean;
    }
  | {
      version: "v4";
      hybrid: number;
      ml: number;
      heuristic: number;
      personalized: number;
      used_ml: boolean;
      v4: {
        predicted_engagement: number;
        affinity: number;
        freshness_decay: number;
        combined: number;
        why: string;
      };
    };

type Row = {
  id: string;
  kind: string;
  actor_id: string;
  created_at: string;
  rank_score?: number;
  signals?: Record<string, number>;
  ranking?: RankingMeta;
};

export function FeedInspectorClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feed?limit=40&debug=1", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { items?: Row[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to load feed");
      setRows(Array.isArray(body.items) ? body.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-mca-body text-mca-ink-muted">Loading ranked feed…</p>;
  }

  if (error) {
    return (
      <p className="text-mca-caption text-mca-error-accent" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-mca-md">
      <div className="flex flex-wrap items-center gap-mca-sm">
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
        <p className="text-mca-caption text-mca-ink-subtle">
          Uses <code className="text-mca-accent/90">GET /api/feed?debug=1</code> — ranking includes hybrid + Phase 82 engagement layer; expand{" "}
          <strong className="text-mca-ink-body">Why am I seeing this?</strong> below.
        </p>
      </div>

      <Panel className="overflow-x-auto border-mca-border bg-mca-surface/40 p-mca-sm">
        <table className="w-full min-w-[960px] border-collapse text-left text-mca-caption">
          <thead>
            <tr className="border-b border-mca-border/80 text-mca-ink-subtle">
              <th className="py-mca-xs pr-mca-sm font-medium">Kind</th>
              <th className="py-mca-xs pr-mca-sm font-medium">Actor</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">SQL rank</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">Hybrid</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">ML</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">Heur</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">Pers</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">V4 Σ</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">Pred</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">Aff</th>
              <th className="py-mca-xs pr-mca-sm font-medium tabular-nums">Fresh</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = r.ranking;
              const v4 = m && m.version === "v4" ? m.v4 : null;
              return (
                <tr key={r.id} className="border-b border-mca-border/40 align-top">
                  <td className="py-mca-sm pr-mca-sm text-mca-ink-body">{r.kind}</td>
                  <td className="max-w-[10rem] truncate py-mca-sm pr-mca-sm font-mono text-mca-ink-muted">{r.actor_id}</td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums text-mca-ink-muted">
                    {typeof r.rank_score === "number" ? r.rank_score.toFixed(0) : "—"}
                  </td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums text-mca-ink-strong">
                    {m ? m.hybrid.toFixed(4) : "—"}
                  </td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums">{m ? m.ml.toFixed(4) : "—"}</td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums">{m ? m.heuristic.toFixed(4) : "—"}</td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums">{m ? m.personalized.toFixed(4) : "—"}</td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums text-mca-accent-strong">
                    {v4 ? v4.combined.toFixed(4) : "—"}
                  </td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums">{v4 ? v4.predicted_engagement.toFixed(4) : "—"}</td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums">{v4 ? v4.affinity.toFixed(4) : "—"}</td>
                  <td className="py-mca-sm pr-mca-sm tabular-nums">{v4 ? v4.freshness_decay.toFixed(4) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="mt-mca-md text-mca-body text-mca-ink-muted">No feed rows — generate community or follow activity first.</p>
        ) : null}
      </Panel>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Why am I seeing this? (Phase 82)
        </p>
        <ul className="mt-mca-md space-y-mca-sm text-mca-caption text-mca-ink-body">
          {rows.map((r) => {
            const why =
              r.ranking && r.ranking.version === "v4" ? r.ranking.v4.why : null;
            return (
              <li key={`why-${r.id}`} className="rounded-mca-control border border-mca-border/60 bg-mca-surface/50 p-mca-sm">
                <p className="font-mono text-mca-caption text-mca-ink-muted">{r.kind} · {r.id.slice(0, 8)}…</p>
                <p className="mt-mca-trace text-mca-body">{why ?? "—"}</p>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
