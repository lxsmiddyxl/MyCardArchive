"use client";

import {
  getRealtimeDevtoolsServerSnapshot,
  getRealtimeDevtoolsSnapshot,
  subscribeRealtimeDevtools,
  type RealtimeDevtoolsSnapshot,
} from "@/lib/dev/realtime-devtools-state";
import { abortChaosLoadTest, isChaosLoadTestRunning, runChaosLoadTest } from "@/lib/dev/chaos";
import { Button } from "@/mca-ui/button";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "mca-realtime-devtools-panel-open";

/** Ctrl+Shift+D (reliable) or Ctrl+Shift+R — some browsers reserve R for reload. */
const HOTKEY_HINT = "Ctrl+Shift+D / R";

function readPersistedPanelOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* private mode / quota */
  }
  return true;
}

function useDevtoolsSnapshot(): RealtimeDevtoolsSnapshot {
  return useSyncExternalStore(
    subscribeRealtimeDevtools,
    getRealtimeDevtoolsSnapshot,
    getRealtimeDevtoolsServerSnapshot
  );
}

function formatTime(ts: number | null): string {
  if (ts == null) return "—";
  return new Date(ts).toLocaleTimeString();
}

export function RealtimeDevtools() {
  const snap = useDevtoolsSnapshot();
  const [open, setOpen] = useState(readPersistedPanelOpen);
  const [chaosBusy, setChaosBusy] = useState(false);
  const [chaosLogLines, setChaosLogLines] = useState<string[]>([]);
  const [chaosLast, setChaosLast] = useState<string | null>(null);

  const persistOpen = useCallback((next: boolean) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      persistOpen(next);
      return next;
    });
  }, [persistOpen]);

  const runChaos = useCallback(async () => {
    setChaosBusy(true);
    setChaosLogLines([]);
    setChaosLast(null);
    try {
      const r = await runChaosLoadTest({
        onLog: (line) => setChaosLogLines((prev) => [...prev.slice(-14), line]),
      });
      setChaosLast(
        r.ok && r.stats
          ? `Done · ${r.stats.postgresEmitted} pg · ${r.stats.presenceCycles} presence · ${r.stats.ms.toFixed(0)}ms`
          : r.message
      );
    } finally {
      setChaosBusy(false);
    }
  }, []);

  const stopChaos = useCallback(() => {
    abortChaosLoadTest();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k !== "d" && k !== "r") return;
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [toggle]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed bottom-4 right-4 z-[100] max-w-[min(100vw-2rem,28rem)] text-left font-mono text-[10px] leading-normal text-mca-ink-body shadow-mca-card shadow-black/50"
      aria-hidden
    >
      <button
        type="button"
        onClick={toggle}
        title={`Toggle realtime devtools (${HOTKEY_HINT})`}
        className="mb-mca-xs w-full rounded-t-lg border border-mca-accent-strong/40 bg-mca-surface-elevated/95 px-mca-sm py-mca-xs text-[10px] font-semibold uppercase tracking-wide text-mca-accent/95 transition duration-200 ease-mca-standard hover:bg-mca-chrome/95"
      >
        Realtime devtools {open ? "▼" : "▶"}{" "}
        <span className="font-normal normal-case text-mca-ink-subtle">({HOTKEY_HINT})</span>
      </button>
      {open ? (
        <div className="max-h-[min(70vh,24rem)] overflow-auto rounded-b-lg border border-t-0 border-mca-accent-strong/40 bg-mca-surface/95 px-mca-sm py-mca-sm">
          <section className="mb-mca-compact" aria-label="Postgres mux channels">
            <p className="mb-mca-xs font-semibold text-mca-success/90">Postgres · mux channels</p>
            {snap.postgres.length === 0 ? (
              <p className="text-mca-hint">None</p>
            ) : (
              <ul className="space-y-mca-micro">
                {snap.postgres.map((row) => (
                  <li key={row.key} className="rounded border border-mca-border/80 bg-mca-surface-elevated/50 px-mca-micro py-mca-xs">
                    <div className="break-all text-mca-nav-accent/90">{row.key}</div>
                    <div className="text-mca-ink-subtle">
                      subs {row.subscribers} · events {row.eventCount} · last {formatTime(row.lastEventAt)}
                    </div>
                    {row.lastEventSummary ? (
                      <div className="break-all text-mca-ink-subtle">{row.lastEventSummary}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-mca-compact" aria-label="Presence topics">
            <p className="mb-mca-xs font-semibold text-cyan-400/90">Presence · topics</p>
            {snap.presence.length === 0 ? (
              <p className="text-mca-hint">None</p>
            ) : (
              <ul className="space-y-mca-micro">
                {snap.presence.map((row) => (
                  <li key={row.logicalName} className="rounded border border-mca-border/80 bg-mca-surface-elevated/50 px-mca-micro py-mca-xs">
                    <div className="break-all text-cyan-200/85">{row.topic}</div>
                    <div className="text-mca-ink-subtle">
                      metas {row.metaCount} · sync {formatTime(row.lastSyncAt)}
                    </div>
                    {row.lastEventSummary ? (
                      <div className="break-all text-mca-ink-subtle">{row.lastEventSummary}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-mca-compact" aria-label="Mux retry attempts">
            <p className="mb-mca-xs font-semibold text-mca-accent/90">Mux · retries</p>
            {snap.muxRetries.length === 0 ? (
              <p className="text-mca-hint">None</p>
            ) : (
              <ul className="space-y-mca-xs">
                {snap.muxRetries.map((r) => (
                  <li key={r.id} className="break-all rounded border border-mca-border/80 bg-mca-surface-elevated/40 px-mca-micro py-mca-xs text-mca-ink-subtle">
                    <span className="text-mca-ink-muted">{r.channelKey}</span> ·{" "}
                    <span className="text-mca-nav-accent/80">{r.kind}</span>
                    {r.kind === "retry" ? (
                      <>
                        {" "}
                        · attempt {r.attempt} · {r.delayMs}ms · {r.status}
                      </>
                    ) : (
                      <> · {r.status}</>
                    )}{" "}
                    · {formatTime(r.at)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-mca-compact" aria-label="Debounce timers">
            <p className="mb-mca-xs font-semibold text-mca-violet-accent/90">Debounce · timers</p>
            {snap.debounces.length === 0 ? (
              <p className="text-mca-hint">None armed</p>
            ) : (
              <ul className="space-y-mca-xs">
                {snap.debounces.map((d) => (
                  <li key={d.id} className="break-all text-mca-ink-subtle">
                    <span className="text-mca-ink-muted">{d.label}</span> · fires {formatTime(d.firesAt)} ·{" "}
                    {d.delayMs}ms
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-mca-compact" aria-label="Silent refetches">
            <p className="mb-mca-xs font-semibold text-mca-info-accent/90">HTTP · silent refetch</p>
            {snap.silentRefetches.length === 0 ? (
              <p className="text-mca-hint">None</p>
            ) : (
              <ul className="space-y-mca-trace">
                {snap.silentRefetches.map((r, i) => (
                  <li key={`${r.source}-${r.at}-${i}`} className="flex justify-between gap-mca-sm text-mca-ink-subtle">
                    <span className="text-mca-ink-muted">{r.source}</span>
                    <span>{formatTime(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Chaos harness">
            <p className="mb-mca-xs font-semibold text-mca-error-accent/90">Chaos · stress (dev)</p>
            <p className="mb-mca-micro text-mca-ink-subtle">
              Synthetic mux burst, silent refetch spam, devtools mux signals, presence churn — bounded; no DB writes.
            </p>
            <div className="flex flex-wrap gap-mca-micro">
              <Button
                type="button"
                variant="secondary"
                className="px-mca-sm py-mca-xs text-[10px]"
                disabled={chaosBusy || isChaosLoadTestRunning()}
                onClick={() => void runChaos()}
              >
                {chaosBusy ? "Running…" : "Run chaos"}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                className="px-mca-sm py-mca-xs text-[10px]"
                disabled={!chaosBusy && !isChaosLoadTestRunning()}
                onClick={stopChaos}
              >
                Abort
              </Button>
            </div>
            {chaosLast ? <p className="mt-mca-micro text-mca-ink-muted">{chaosLast}</p> : null}
            {chaosLogLines.length > 0 ? (
              <ul className="mt-mca-micro max-h-24 space-y-mca-trace overflow-y-auto text-mca-ink-subtle">
                {chaosLogLines.map((line, i) => (
                  <li key={`${line}-${i}`} className="break-all">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
