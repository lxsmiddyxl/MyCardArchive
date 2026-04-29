"use client";

import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type Reciprocal = {
  other_user_id: string;
  you_receive_catalog_id: string;
  you_send_catalog_id: string;
};

type Loop3 = {
  u1: string;
  u2: string;
  u3: string;
  edge_12_catalog_id: string;
  edge_23_catalog_id: string;
  edge_31_catalog_id: string;
};

export function MarketAutoMatchPanel() {
  const [reciprocal, setReciprocal] = useState<Reciprocal[]>([]);
  const [loops, setLoops] = useState<Loop3[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market/auto-match", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        matches?: { reciprocal?: Reciprocal[]; loops_3?: Loop3[] };
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load matches");
      const m = body.matches ?? {};
      setReciprocal(Array.isArray(m.reciprocal) ? m.reciprocal : []);
      setLoops(Array.isArray(m.loops_3) ? m.loops_3 : []);
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
        <p className="text-mca-caption text-mca-ink-muted">Loading auto-match…</p>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Auto-match suggestions
      </p>
      <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
        Reciprocal pairs from your For trade / Looking for signals. Three-way loops are best-effort graph
        hints.
      </p>

      {reciprocal.length === 0 && loops.length === 0 ? (
        <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No structured matches right now.</p>
      ) : null}

      {reciprocal.length > 0 ? (
        <div className="mt-mca-md">
          <p className="text-sm font-medium text-mca-ink-strong">Reciprocal FT/LF</p>
          <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-body">
            {reciprocal.slice(0, 12).map((r, i) => (
              <li key={`${r.other_user_id}-${r.you_receive_catalog_id}-${i}`} className="font-mono">
                vs {r.other_user_id.slice(0, 8)}… · you get {r.you_receive_catalog_id.slice(0, 8)}… · you send{" "}
                {r.you_send_catalog_id.slice(0, 8)}…
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loops.length > 0 ? (
        <div className="mt-mca-md">
          <p className="text-sm font-medium text-mca-ink-strong">3-user loops</p>
          <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-body">
            {loops.slice(0, 8).map((l, i) => (
              <li key={`${l.u1}-${l.u2}-${l.u3}-${i}`} className="font-mono">
                {l.u1.slice(0, 6)}… → {l.u2.slice(0, 6)}… → {l.u3.slice(0, 6)}… → {l.u1.slice(0, 6)}…
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
