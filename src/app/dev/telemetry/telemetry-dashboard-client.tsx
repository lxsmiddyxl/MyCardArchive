"use client";

import type { TelemetrySnapshot } from "@/lib/telemetry/aggregation";
import { useCallback, useEffect, useState } from "react";

export function TelemetryDashboardClient() {
  const [snap, setSnap] = useState<TelemetrySnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/telemetry", { credentials: "include" });
      if (!res.ok) {
        setErr(`${res.status} ${res.statusText}`);
        return;
      }
      const data = (await res.json()) as TelemetrySnapshot;
      setSnap(data);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  if (err) {
    return <p className="text-xs text-mca-error-accent">{err}</p>;
  }
  if (!snap) {
    return <p className="text-xs text-mca-ink-subtle">Loading…</p>;
  }

  return (
    <div className="space-y-mca-base font-mono text-xs text-mca-ink-body">
      <p className="text-mca-ink-subtle">Generated {snap.generatedAt}</p>
      <section>
        <h2 className="mb-mca-xs font-semibold text-mca-success/90">Totals (retained window)</h2>
        <pre className="max-h-40 overflow-auto rounded border border-mca-border bg-mca-surface/80 p-mca-sm text-[11px]">
          {JSON.stringify(snap.totals, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="mb-mca-xs font-semibold text-mca-accent/90">Per-minute (last hour)</h2>
        <pre className="max-h-64 overflow-auto rounded border border-mca-border bg-mca-surface/80 p-mca-sm text-[11px]">
          {JSON.stringify(snap.perMinute, null, 2)}
        </pre>
      </section>
    </div>
  );
}
