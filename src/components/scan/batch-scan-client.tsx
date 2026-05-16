"use client";

import type { ScanBatchSuccessDTO } from "@/lib/dto/scan-add";
import { rankingFromAutoMatch } from "@/lib/scanning/phase3/fallback-ranking";
import { ScanConfirmationPanel } from "@/components/scan/scan-confirmation-panel";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import { PendingOfflineScansPanel } from "@/mca-ui/pending-offline-scans-panel";
import { fetchJson } from "@/lib/client";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const LAST_BINDER_KEY = "mca:scan:last-binder-id";
const MAX_FILES = 9;

type BinderItem = { id: string; name: string };

export function BatchScanClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const online = useOnlineStatus();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanBatchSuccessDTO["results"]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [binders, setBinders] = useState<BinderItem[]>([]);
  const [binderId, setBinderId] = useState("");

  useEffect(() => {
    void (async () => {
      const r = await fetchJson<{ binders: BinderItem[] }>("/api/binders", { cache: "no-store" });
      if (r.kind !== "ok") return;
      const list = r.data.binders ?? [];
      setBinders(list);
      const stored = typeof window !== "undefined" ? localStorage.getItem(LAST_BINDER_KEY) : "";
      if (stored && list.some((b) => b.id === stored)) setBinderId(stored);
    })();
  }, []);

  const onFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_FILES);
    setFiles(next);
    setResults([]);
    setError(null);
  }, []);

  const runBatch = async () => {
    if (!files.length || loading) return;
    if (!online) {
      setError("Batch scan requires an internet connection.");
      return;
    }
    setLoading(true);
    setError(null);
    const fd = new FormData();
    for (const f of files) fd.append("images", f);
    try {
      const res = await fetch("/api/scan/batch", { method: "POST", body: fd });
      const json = (await res.json()) as ScanBatchSuccessDTO & { error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Batch scan failed");
        setLoading(false);
        return;
      }
      setResults(json.results);
      setActiveIndex(0);
    } catch {
      setError("Network error during batch scan.");
    }
    setLoading(false);
  };

  const active = results[activeIndex];
  const ranking = active?.ranking ?? (active ? rankingFromAutoMatch(active.auto_match) : null);

  return (
    <div className="mx-auto max-w-4xl space-y-mca-lg px-mca-page-x py-mca-page-y">
      <header className="space-y-mca-compact">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
          Scan
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong">Batch scan</h1>
        <p className="text-sm text-mca-ink-muted">
          Upload up to {MAX_FILES} photos — we detect card regions and run the full intelligence
          pipeline on each.
        </p>
        <Link href="/scan/v2" className="text-sm text-mca-accent-strong hover:underline">
          ← Single card scan
        </Link>
      </header>

      {!online ? <PendingOfflineScansPanel /> : null}

      <Panel className="space-y-mca-md p-mca-md">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          Choose images ({files.length}/{MAX_FILES})
        </Button>
        {files.length > 0 ? (
          <ul className="grid grid-cols-3 gap-mca-sm sm:grid-cols-4">
            {files.map((f) => (
              <li
                key={f.name + f.size}
                className="truncate rounded-mca-control border border-mca-border px-mca-xs py-mca-trace text-mca-caption"
              >
                {f.name}
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <InlineError>{error}</InlineError> : null}
        <Button
          type="button"
          variant="primary"
          disabled={!files.length || loading}
          onClick={() => void runBatch()}
          className="inline-flex gap-mca-sm"
        >
          {loading ? <LoadingSpinner className="size-4" /> : null}
          {loading ? "Scanning…" : "Run batch scan"}
        </Button>
      </Panel>

      {results.length > 0 ? (
        <Panel className="space-y-mca-md p-mca-md">
          <Field id="batch-binder" label="Binder">
            <select
              id="batch-binder"
              value={binderId}
              onChange={(e) => {
                setBinderId(e.target.value);
                localStorage.setItem(LAST_BINDER_KEY, e.target.value);
              }}
              className="mca-input w-full rounded-mca-control px-mca-sm py-mca-sm text-sm"
            >
              <option value="">Select binder…</option>
              {binders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap gap-mca-xs" role="tablist" aria-label="Batch results">
            {results.map((r, i) => (
              <button
                key={r.scan_event_id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "rounded-mca-control border px-mca-sm py-mca-xs text-xs font-medium transition duration-200 ease-mca-standard",
                  i === activeIndex
                    ? "border-mca-accent-border/60 bg-mca-accent-border/15"
                    : "border-mca-border"
                )}
              >
                Card {i + 1}
              </button>
            ))}
          </div>

          {ranking && binderId && active ? (
            <ScanConfirmationPanel
              ranking={ranking}
              normalized={active.card}
              scanEventId={active.scan_event_id}
              binderId={binderId}
              onScanNext={() => setActiveIndex((i) => Math.min(results.length - 1, i + 1))}
            />
          ) : (
            <p className="text-sm text-mca-ink-muted">Select a binder to confirm and add cards.</p>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
