"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type GraphPayload = {
  edge_count_out?: number;
  edge_count_in?: number;
  edges_out_sample?: { to_user_id: string; catalog_card_id: string }[];
  edges_in_sample?: { from_user_id: string; catalog_card_id: string }[];
  best_trade_paths?: unknown[];
  error?: string;
};

type Loop3 = {
  u1: string;
  u2: string;
  u3: string;
  edge_12_catalog_id: string;
  edge_23_catalog_id: string;
  edge_31_catalog_id: string;
  party_count?: number;
};

type Loop4 = {
  u1: string;
  u2: string;
  u3: string;
  u4: string;
  edge_12_catalog_id: string;
  edge_23_catalog_id: string;
  edge_34_catalog_id: string;
  edge_41_catalog_id: string;
  party_count?: number;
};

function pathLabel(p: Record<string, unknown>): string {
  const k = String(p.kind ?? "");
  if (k === "reciprocal") {
    return `Swap · partner ${String(p.partner_user_id ?? "").slice(0, 8)}… · receive ${String(p.you_receive_catalog_id ?? "").slice(0, 8)}… · send ${String(p.you_send_catalog_id ?? "").slice(0, 8)}…`;
  }
  if (k === "two_hop") {
    return `2-hop · via ${String(p.middle_user_id ?? "").slice(0, 8)}… · send ${String(p.you_send_catalog_id ?? "").slice(0, 8)}… · receive ${String(p.you_receive_catalog_id ?? "").slice(0, 8)}…`;
  }
  return JSON.stringify(p);
}

export function MarketEnginePanel() {
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [loops3, setLoops3] = useState<Loop3[]>([]);
  const [loops4, setLoops4] = useState<Loop4[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market/engine", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        graph?: GraphPayload;
        loops?: { loops_3?: Loop3[]; loops_4?: Loop4[] };
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Engine failed");
      setGraph(body.graph ?? null);
      setLoops3(Array.isArray(body.loops?.loops_3) ? body.loops.loops_3 : []);
      setLoops4(Array.isArray(body.loops?.loops_4) ? body.loops.loops_4 : []);
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
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-caption text-mca-ink-muted">Loading marketplace engine…</p>
      </Panel>
    );
  }

  if (error || graph?.error) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error ?? graph?.error}
        </p>
      </Panel>
    );
  }

  const paths = Array.isArray(graph?.best_trade_paths) ? graph.best_trade_paths : [];
  const reciprocal = paths.filter((p) => p && typeof p === "object" && (p as { kind?: string }).kind === "reciprocal");
  const twoHop = paths.filter((p) => p && typeof p === "object" && (p as { kind?: string }).kind === "two_hop");

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <div>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Marketplace engine
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
            FT→LF graph (Phase 81). Out {graph?.edge_count_out ?? 0} · In {graph?.edge_count_in ?? 0} edges.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <div className="mt-mca-lg space-y-mca-md">
        <div>
          <p className="text-sm font-semibold text-mca-ink-strong">Best trade paths</p>
          <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">
            Direct swaps and two-hop chains that resolve cross-user FT/LF from your binder signals.
          </p>
          {paths.length === 0 ? (
            <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">No paths yet — set For trade / Looking for on catalog cards.</p>
          ) : (
            <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-body">
              {reciprocal.slice(0, 16).map((p, i) => (
                <li key={`r-${i}`} className="font-mono">
                  {pathLabel(p as Record<string, unknown>)}
                </li>
              ))}
              {twoHop.slice(0, 16).map((p, i) => (
                <li key={`t-${i}`} className="font-mono">
                  {pathLabel(p as Record<string, unknown>)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-mca-ink-strong">Multi-party opportunities</p>
          <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">
            Directed loops where each hop is “you ship a card someone is looking for.”
          </p>
          {loops3.length === 0 && loops4.length === 0 ? (
            <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">No multi-party loops detected.</p>
          ) : (
            <ul className="mt-mca-sm space-y-mca-sm">
              {loops3.slice(0, 12).map((l, i) => (
                <li key={`3-${i}`} className="font-mono text-mca-caption text-mca-ink-body">
                  3-party · {l.u1.slice(0, 6)}… → {l.u2.slice(0, 6)}… → {l.u3.slice(0, 6)}… → {l.u1.slice(0, 6)}…
                </li>
              ))}
              {loops4.slice(0, 8).map((l, i) => (
                <li key={`4-${i}`} className="font-mono text-mca-caption text-mca-ink-body">
                  4-party · {l.u1.slice(0, 6)}… → {l.u2.slice(0, 6)}… → {l.u3.slice(0, 6)}… → {l.u4.slice(0, 6)}… →{" "}
                  {l.u1.slice(0, 6)}…
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
