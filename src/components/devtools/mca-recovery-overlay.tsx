"use client";

import { fetchJson } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useState } from "react";

type Snapshot = {
  ok?: boolean;
  attempts?: Array<{
    name: string;
    ts: number;
    ok: boolean;
    recovered: boolean;
    data?: unknown;
  }>;
  ingestBackoff?: { until: number; streak: number };
};

type DiagJson = { ok?: boolean; results?: Array<{ name: string; ok: boolean; data?: unknown }> };

const POLL_MS = 5000;

export function McaRecoveryOverlay() {
  const enabled = process.env.NEXT_PUBLIC_STABILITY_MODE === "1";
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [diag, setDiag] = useState<DiagJson | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!enabled) return;
    try {
      const [rSnap, rDiag] = await Promise.all([
        fetchJson<Snapshot>("/api/internal/recovery/snapshot", { cache: "no-store" }),
        fetchJson<DiagJson>("/api/health/diagnostics", { cache: "no-store" }),
      ]);
      setSnap(rSnap.kind === "ok" ? (rSnap.data as Snapshot) : null);
      setDiag(rDiag.kind === "ok" ? (rDiag.data as DiagJson) : null);
    } catch {
      setSnap({ ok: false });
    }
  }, [enabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    void fetchAll();
    const id = window.setInterval(() => void fetchAll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [mounted, enabled, fetchAll]);

  if (!mounted || !enabled) return null;

  const attempts = snap?.attempts ?? [];
  const last = attempts[attempts.length - 1];

  return (
    <div className="pointer-events-none fixed left-3 top-20 z-[101] max-h-[min(60vh,420px)] w-[min(92vw,340px)] overflow-y-auto text-left text-[11px] leading-snug text-mca-ink-strong">
      <div className="pointer-events-auto rounded-mca-block border border-mca-border bg-mca-surface/95 p-mca-sm shadow-mca-panel backdrop-blur-md duration-200 ease-mca-standard">
        <div className="mb-mca-xs font-semibold text-mca-accent">MCA recovery</div>
        <p className="mb-mca-sm text-mca-ink-muted">NEXT_PUBLIC_STABILITY_MODE=1 · last attempts below</p>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Last recovery</div>
          {last ? (
            <div className="text-mca-ink-muted">
              <div>action: {last.name}</div>
              <div>ok: {String(last.ok)} · recovered: {String(last.recovered)}</div>
              <div>ts: {new Date(last.ts).toISOString()}</div>
            </div>
          ) : (
            <div className="text-mca-ink-muted">—</div>
          )}
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Recent attempts</div>
          <ul className="max-h-32 list-inside list-disc overflow-y-auto text-mca-ink-muted">
            {attempts.slice(-8).map((a) => (
              <li key={`${a.name}-${a.ts}`}>
                {a.name} · ok={String(a.ok)} · {new Date(a.ts).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="mb-mca-sm space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Ingest backoff</div>
          <div className="text-mca-ink-muted">
            streak: {snap?.ingestBackoff?.streak ?? "—"} · until:{" "}
            {snap?.ingestBackoff?.until
              ? new Date(snap.ingestBackoff.until).toLocaleTimeString()
              : "—"}
          </div>
        </Panel>

        <Panel className="space-y-mca-xs p-mca-sm">
          <div className="font-medium text-mca-ink-strong">Diagnostics (recovery hints)</div>
          <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-mca-ink-muted">
            {diag?.results
              ? diag.results
                  .filter((r) => r.data && typeof r.data === "object" && "recoveryAttempt" in (r.data as object))
                  .map((r) => `${r.name}: ${JSON.stringify(r.data)}`)
                  .join("\n") || "—"
              : "…"}
          </pre>
        </Panel>
      </div>
    </div>
  );
}
