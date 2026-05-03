"use client";

import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useState } from "react";

type Snapshot = {
  userId: string;
  assignments: Record<string, string>;
  flags: Record<string, boolean>;
};

export function ExperimentsDevPanel() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchJson<Snapshot & { error?: string }>("/api/dev/experiments/snapshot", {
        cache: "no-store",
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      setData(r.data as Snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Live snapshot
      </p>
      <p className="mt-mca-xs text-mca-caption text-mca-hint">
        Calls the dev API (telemetry: <span className="font-mono">experiment.assign</span>,{" "}
        <span className="font-mono">experiment.variant_exposure</span>).
      </p>
      <Button
        type="button"
        className="mt-mca-md"
        variant="secondary"
        disabled={loading}
        onClick={() => void load()}
      >
        {loading ? "Loading…" : "Refresh snapshot"}
      </Button>
      {error ? <p className="mt-mca-md text-mca-caption text-red-500/90">{error}</p> : null}
      {data ? (
        <pre className="mt-mca-md max-h-96 overflow-auto rounded-mca-control border border-mca-border bg-mca-surface-elevated/50 p-mca-sm font-mono text-mca-caption text-mca-ink-body">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </Panel>
  );
}
