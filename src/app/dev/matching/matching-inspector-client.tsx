"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useState } from "react";

export function MatchingInspectorClient() {
  const [json, setJson] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/dev/matching/inspect", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setErr(typeof body.error === "string" ? body.error : "Failed");
        return;
      }
      setJson(JSON.stringify(body, null, 2));
      mcaLog.event(
        "matching.score.inspect",
        { source: "dev-inspector" },
        { componentName: "MatchingInspector", surfaceName: "matching" }
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-mca-lg rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 p-mca-lg">
      <div className="flex flex-wrap items-center justify-between gap-mca-sm">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Phase 2 scores
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-strong transition duration-200 ease-mca-standard hover:bg-mca-border-subtle"
        >
          Refresh
        </button>
      </div>
      {err ? <p className="text-sm text-mca-error-text-strong">{err}</p> : null}
      {json ? (
        <pre className="max-h-[480px] overflow-auto rounded-mca-block border border-mca-border bg-mca-surface/80 p-mca-sm text-xs text-mca-ink-body">
          {json}
        </pre>
      ) : !err ? (
        <p className="text-mca-body text-mca-ink-muted">Loading…</p>
      ) : null}
    </div>
  );
}
