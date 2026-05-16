"use client";

import type { ScanBatchSuccessDTO } from "@/lib/dto/scan-add";
import { rankingFromAutoMatch } from "@/lib/scanning/phase3/fallback-ranking";
import {
  hydrateFromRankedCandidate,
  toCardCreateBody,
} from "@/mca-utils/catalog/hydrateCardMetadata";
import { compressFilesForScan } from "@/mca-utils/scan/imageCompression";
import { ScanConfirmationPanel } from "@/components/scan/scan-confirmation-panel";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import { ScanVariantThumb } from "@/mca-ui/scan-variant-thumb";
import { PendingOfflineScansPanel } from "@/mca-ui/pending-offline-scans-panel";
import { fetchJson, fetchJsonUserFacingMessage } from "@/lib/client";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { MCA_MOTION_GRID_CELL, MCA_MOTION_PANEL, MCA_MOTION_SELECTION_RING } from "@/lib/ui/mca-motion";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LAST_BINDER_KEY = "mca:scan:last-binder-id";
const MAX_FILES = 9;

type BinderItem = { id: string; name: string };

export function BatchScanClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const online = useOnlineStatus();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);
  const [results, setResults] = useState<ScanBatchSuccessDTO["results"]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [binders, setBinders] = useState<BinderItem[]>([]);
  const [binderId, setBinderId] = useState("");
  const [applyBinderToAll, setApplyBinderToAll] = useState(true);

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

  useEffect(() => {
    return () => {
      for (const u of previews) URL.revokeObjectURL(u);
    };
  }, [previews]);

  const onFiles = useCallback(async (list: FileList | null) => {
    if (!list) return;
    const raw = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_FILES);
    const compressed = await compressFilesForScan(raw);
    setFiles(compressed);
    setPreviews((prev) => {
      for (const u of prev) URL.revokeObjectURL(u);
      return compressed.map((f) => URL.createObjectURL(f));
    });
    setResults([]);
    setError(null);
    setActiveIndex(0);
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

  const rescanActive = async () => {
    const fileIndex = Math.min(activeIndex, files.length - 1);
    const file = files[fileIndex];
    if (!file || rescanning) return;
    setRescanning(true);
    setError(null);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch("/api/scan/v2", { method: "POST", body: fd });
      const json = (await res.json()) as {
        success?: boolean;
        scan_event_id?: string;
        card?: ScanBatchSuccessDTO["results"][0]["card"];
        ranking?: ScanBatchSuccessDTO["results"][0]["ranking"];
        auto_match?: ScanBatchSuccessDTO["results"][0]["auto_match"];
        error?: string;
      };
      if (!res.ok || !json.success || !json.scan_event_id) {
        setError(json.error ?? "Re-scan failed");
        setRescanning(false);
        return;
      }
      const ranking =
        json.ranking ?? (json.auto_match ? rankingFromAutoMatch(json.auto_match) : null);
      if (!ranking || !json.card) {
        setError("Re-scan returned incomplete data.");
        setRescanning(false);
        return;
      }
      setResults((prev) => {
        const next = [...prev];
        next[activeIndex] = {
          region_index: activeIndex,
          scan_event_id: json.scan_event_id!,
          ranking,
          card: json.card!,
          auto_match: json.auto_match!,
        };
        return next;
      });
    } catch {
      setError("Network error during re-scan.");
    }
    setRescanning(false);
  };

  const addAllToBinder = async () => {
    if (!binderId.trim() || bulkAdding) return;
    setBulkAdding(true);
    setBulkErr(null);
    let failed = 0;
    for (const r of results) {
      const ranking = r.ranking ?? rankingFromAutoMatch(r.auto_match);
      const top = ranking.topCandidate;
      if (!top) continue;
      const meta = hydrateFromRankedCandidate(top);
      const res = await fetchJson<{ card: { id: string } }>("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCardCreateBody(meta, binderId, { scan_event_id: r.scan_event_id })),
      });
      if (res.kind !== "ok") failed += 1;
    }
    setBulkAdding(false);
    if (failed > 0) {
      setBulkErr(`${failed} card(s) could not be added. Check duplicates or limits.`);
    }
  };

  const active = results[activeIndex];
  const ranking = active?.ranking ?? (active ? rankingFromAutoMatch(active.auto_match) : null);

  const gridItems = useMemo(
    () =>
      results.map((r, i) => {
        const rk = r.ranking ?? rankingFromAutoMatch(r.auto_match);
        return { result: r, ranking: rk, index: i };
      }),
    [results]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-mca-lg px-mca-page-x py-mca-page-y">
      <header className="space-y-mca-compact">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
          Scan
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong">Batch scan</h1>
        <p className="text-sm text-mca-ink-muted">
          Upload up to {MAX_FILES} photos — images are compressed automatically. We detect card
          regions and run the full intelligence pipeline on each.
        </p>
        <Link href="/scan/v2" className="text-sm text-mca-accent-strong hover:underline">
          ← Single card scan
        </Link>
      </header>

      {!online ? <PendingOfflineScansPanel /> : null}

      <Panel className={cn("space-y-mca-md p-mca-md", MCA_MOTION_PANEL)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Choose batch scan images"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          Choose images ({files.length}/{MAX_FILES})
        </Button>
        {previews.length > 0 ? (
          <ul
            className="grid grid-cols-3 gap-mca-sm sm:grid-cols-4"
            aria-label="Selected batch images"
          >
            {previews.map((url, i) => (
              <li
                key={url}
                className={cn(
                  "overflow-hidden rounded-mca-control border border-mca-border",
                  MCA_MOTION_GRID_CELL
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Upload ${i + 1}`} className="aspect-[5/7] w-full object-cover" />
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
        <Panel className={cn("space-y-mca-md p-mca-md", MCA_MOTION_PANEL)}>
          <Field id="batch-binder" label="Binder for all cards">
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

          <label className="flex items-center gap-mca-sm text-sm text-mca-ink-muted">
            <input
              type="checkbox"
              checked={applyBinderToAll}
              onChange={(e) => setApplyBinderToAll(e.target.checked)}
              className="rounded-mca-control border-mca-border"
            />
            Use this binder for all cards in this batch
          </label>

          <div
            className="grid grid-cols-2 gap-mca-sm sm:grid-cols-3 md:grid-cols-4"
            role="tablist"
            aria-label="Batch scan results grid"
          >
            {gridItems.map(({ ranking: rk, index: i }) => {
              const top = rk.topCandidate;
              const selected = i === activeIndex;
              return (
                <button
                  key={results[i]!.scan_event_id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={
                    top
                      ? `${top.card_name}, ${Math.round(top.confidence * 100)}% confidence`
                      : `Card ${i + 1}`
                  }
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "rounded-mca-card border p-mca-xs text-left transition-all duration-200 ease-mca-standard",
                    MCA_MOTION_GRID_CELL,
                    selected
                      ? cn("border-mca-accent-border/60 bg-mca-accent-border/10", MCA_MOTION_SELECTION_RING)
                      : "border-mca-border bg-mca-surface/40 hover:border-mca-field-border"
                  )}
                >
                  {top ? (
                    <ScanVariantThumb candidate={top} variantGroup={top.variantGroup} size="sm" />
                  ) : null}
                  <p className="mt-mca-xs truncate text-xs font-medium text-mca-ink-strong">
                    {top?.card_name ?? `Card ${i + 1}`}
                  </p>
                  <p className="truncate text-mca-caption text-mca-ink-muted">
                    {top ? `${Math.round(top.confidence * 100)}%` : "—"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-mca-sm">
            <Button
              type="button"
              variant="secondary"
              disabled={rescanning || !files.length}
              onClick={() => void rescanActive()}
            >
              {rescanning ? "Re-scanning…" : "Re-scan this card"}
            </Button>
            {binderId.trim() ? (
              <Button
                type="button"
                variant="primary"
                disabled={bulkAdding}
                onClick={() => void addAllToBinder()}
              >
                {bulkAdding ? "Adding…" : "Add all to binder"}
              </Button>
            ) : null}
          </div>
          {bulkErr ? <InlineError>{bulkErr}</InlineError> : null}

          {ranking && binderId.trim() && active && applyBinderToAll ? (
            <ScanConfirmationPanel
              ranking={ranking}
              normalized={active.card}
              scanEventId={active.scan_event_id}
              binderId={binderId}
              onScanNext={() =>
                setActiveIndex((i) => Math.min(results.length - 1, i + 1))
              }
              scanNextLabel="Next card in batch →"
            />
          ) : (
            <p className="text-sm text-mca-ink-muted">
              Select a binder to confirm cards. Toggle the checkbox above to apply one binder to every
              result.
            </p>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
