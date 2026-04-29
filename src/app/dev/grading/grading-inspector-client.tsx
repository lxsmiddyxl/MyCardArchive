"use client";

import { useCallback, useEffect, useState } from "react";

type InspectPayload = {
  pipelineVersion: string;
  modelUrlConfigured: boolean;
  envelope: unknown;
  modelInput: unknown;
  heuristicSummary: unknown;
};

export function GradingInspectorClient() {
  const [data, setData] = useState<InspectPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/dev/grading/inspect", { cache: "no-store" });
      const body = (await res.json()) as InspectPayload & { error?: string };
      if (!res.ok) {
        setErr(body.error ?? "Failed to load");
        return;
      }
      setData(body);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-mca-lg rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 p-mca-lg">
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Model inspector
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
        >
          Refresh
        </button>
      </div>
      {err ? (
        <p className="text-sm text-mca-error-text-strong">{err}</p>
      ) : null}
      {data ? (
        <div className="space-y-mca-md text-sm">
          <p className="text-mca-ink-muted">
            Pipeline <span className="font-mono text-mca-ink-body">{data.pipelineVersion}</span> · Model
            URL{" "}
            <span className="font-semibold text-mca-ink-strong">
              {data.modelUrlConfigured ? "configured" : "not set"}
            </span>{" "}
            (<code className="text-xs">MCA_GRADING_MODEL_URL</code>)
          </p>
          <div>
            <p className="mb-mca-xs text-mca-caption font-medium text-mca-ink-subtle">Request envelope</p>
            <pre className="max-h-48 overflow-auto rounded-mca-block border border-mca-border bg-mca-surface/80 p-mca-sm text-xs text-mca-ink-body">
              {JSON.stringify(data.envelope, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-mca-xs text-mca-caption font-medium text-mca-ink-subtle">Model input (v1)</p>
            <pre className="max-h-48 overflow-auto rounded-mca-block border border-mca-border bg-mca-surface/80 p-mca-sm text-xs text-mca-ink-body">
              {JSON.stringify(data.modelInput, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-mca-xs text-mca-caption font-medium text-mca-ink-subtle">Heuristic summary (sample card id)</p>
            <pre className="max-h-48 overflow-auto rounded-mca-block border border-mca-border bg-mca-surface/80 p-mca-sm text-xs text-mca-ink-body">
              {JSON.stringify(data.heuristicSummary, null, 2)}
            </pre>
          </div>
        </div>
      ) : !err ? (
        <p className="text-mca-body text-mca-ink-muted">Loading…</p>
      ) : null}
    </div>
  );
}
