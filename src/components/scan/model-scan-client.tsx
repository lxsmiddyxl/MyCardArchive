"use client";

import type { NormalizedCard } from "@/lib/ai/normalize-card";
import {
  confidenceBand,
  confidenceBandDescription,
  confidenceBandLabel,
} from "@/lib/scanning/v1/confidence-label";
import type { ScanV25QualBand, ScanV25VisualIntel } from "@/lib/scanning/v2_5/types";
import type { AutoMatchCandidate } from "@/lib/types/auto-match";
import type { ScanCandidateDTO, ScanV2PipelineSuccessDTO } from "@/lib/dto/scan-add";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import { LoadingSpinner } from "@/mca-ui/loading-button";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { fetchJson, readResponseJson } from "@/lib/client";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";

const LAST_BINDER_STORAGE_KEY = "mca:scan:last-binder-id";

type BinderListItem = { id: string; name: string };

function matchKey(m: AutoMatchCandidate): string {
  return `${m.catalog_card_id ?? ""}|${m.card_name}|${m.number}`;
}

function buildAddCardHref(
  binderId: string,
  card: NormalizedCard,
  match: AutoMatchCandidate | null,
  scanEventId: string
): string {
  const q = new URLSearchParams();
  if (card.name) q.set("name", card.name);
  if (card.number) q.set("number", card.number);
  if (card.rarity) q.set("rarity", card.rarity);
  if (card.image_url) q.set("image_url", card.image_url);
  if (match?.catalog_card_id?.trim()) {
    q.set("catalog_card_id", match.catalog_card_id.trim());
  }
  if (match?.set_name?.trim()) {
    q.set("set_name", match.set_name.trim());
  }
  q.set("scan_event_id", scanEventId);
  return `/binders/${encodeURIComponent(binderId)}/add-card?${q}`;
}

function holoLabel(h: ScanV2PipelineSuccessDTO["vision_model"]["holo_status"]): string {
  switch (h) {
    case "reverse_holo":
      return "Reverse holo";
    case "holo":
      return "Holo foil";
    case "none":
      return "Non-holo";
    default:
      return "Unknown";
  }
}

function signalConfidenceLabel(band: ScanV25QualBand): string {
  switch (band) {
    case "strong":
      return "Strong signal";
    case "likely":
      return "Likely signal";
    default:
      return "Weak signal";
  }
}

const OcrCatalogSuggestionRow = memo(function OcrCatalogSuggestionRow({
  candidate,
  selected,
  onSelect,
}: {
  candidate: ScanCandidateDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  const band = confidenceBand(candidate.confidence);
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          "flex w-full gap-mca-sm rounded-mca-control border p-mca-sm text-left transition duration-200 ease-mca-standard focus-visible:outline focus-visible:ring-2 focus-visible:ring-mca-focus/60",
          selected
            ? "border-mca-accent-border/60 bg-mca-accent-border/10"
            : "border-mca-border bg-mca-surface/40 hover:border-mca-field-border"
        )}
      >
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface">
          {candidate.image_url ? (
            <RemoteCardThumb
              src={candidate.image_url}
              alt=""
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-mca-hint">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-mca-ink-strong">{candidate.card_name}</p>
          <p className="truncate text-mca-caption text-mca-ink-muted">
            {candidate.set_name} · #{candidate.number}
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
            {confidenceBandLabel(band)}
          </p>
        </div>
      </button>
    </li>
  );
});

type UiPhase = "idle" | "preview" | "loading" | "result" | "error";

export function ModelScanClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const scanV2SeqRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<UiPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [binders, setBinders] = useState<BinderListItem[]>([]);
  const [bindersLoading, setBindersLoading] = useState(true);
  const [binderError, setBinderError] = useState<string | null>(null);
  const [binderId, setBinderId] = useState("");
  const [result, setResult] = useState<ScanV2PipelineSuccessDTO | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [visionConfigured, setVisionConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchJson<{
        scanning_v2?: { enabled?: boolean; message?: string };
      }>("/api/scan/v2", { method: "GET", cache: "no-store" });
      if (cancelled || r.kind !== "ok") return;
      setVisionConfigured(Boolean(r.data.scanning_v2?.enabled));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBindersLoading(true);
      setBinderError(null);
      const r = await fetchJson<{ binders: { id: string; name: string }[] }>("/api/binders", {
        cache: "no-store",
      });
      if (cancelled) return;
      setBindersLoading(false);
      if (r.kind !== "ok") {
        setBinderError("Could not load binders.");
        return;
      }
      const list = Array.isArray(r.data.binders) ? r.data.binders : [];
      const mapped = list.map((b) => ({
        id: b.id,
        name: typeof b.name === "string" ? b.name : "Binder",
      }));
      setBinders(mapped);
      if (typeof window !== "undefined" && mapped.length > 0) {
        const stored = window.localStorage.getItem(LAST_BINDER_STORAGE_KEY)?.trim() ?? "";
        if (stored && mapped.some((b) => b.id === stored)) {
          setBinderId(stored);
        } else if (mapped.length === 1) {
          setBinderId(mapped[0].id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyFile = useCallback((next: File | null) => {
    if (next && !next.type.startsWith("image/")) return;
    scanV2SeqRef.current += 1;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next && next.type.startsWith("image/") ? next : null);
    if (next) setPhase("preview");
    else setPhase("idle");
    setLoadingDetail(null);
    setError(null);
    setResult(null);
    setSelectedMatchId(null);
  }, []);

  const applyBackFile = useCallback((next: File | null) => {
    if (next && !next.type.startsWith("image/")) return;
    scanV2SeqRef.current += 1;
    setBackPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next ? URL.createObjectURL(next) : null;
    });
    setBackFile(next && next.type.startsWith("image/") ? next : null);
    if (next) setPhase("preview");
    setLoadingDetail(null);
    setError(null);
    setResult(null);
    setSelectedMatchId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (backPreviewUrl) URL.revokeObjectURL(backPreviewUrl);
    };
  }, [previewUrl, backPreviewUrl]);

  const persistBinderChoice = (id: string) => {
    if (typeof window !== "undefined" && id.trim()) {
      window.localStorage.setItem(LAST_BINDER_STORAGE_KEY, id.trim());
    }
  };

  const runScan = async () => {
    if (!file || phase === "loading") return;
    const runId = ++scanV2SeqRef.current;
    setPhase("loading");
    setError(null);
    setResult(null);
    setSelectedMatchId(null);
    setLoadingDetail("Preparing images…");

    const fd = new FormData();
    fd.append("image", file);
    if (backFile) fd.append("image_back", backFile);

    const tid = window.setTimeout(() => {
      setLoadingDetail("Running vision model and OCR catalog match…");
    }, 320);

    let res: Response;
    try {
      res = await fetchWithRetry("/api/scan/v2", { method: "POST", body: fd });
    } catch {
      window.clearTimeout(tid);
      if (runId !== scanV2SeqRef.current) return;
      setLoadingDetail(null);
      setPhase("error");
      setError("Network error — check your connection and try again.");
      return;
    }
    window.clearTimeout(tid);
    if (runId !== scanV2SeqRef.current) return;
    setLoadingDetail(null);

    const parsed = await readResponseJson<
      ScanV2PipelineSuccessDTO & Record<string, unknown>
    >(res);

    if (runId !== scanV2SeqRef.current) return;

    if (res.status === 429) {
      setPhase("error");
      setError("Too many scans right now. Wait a moment and try again.");
      return;
    }

    if (parsed.kind !== "ok") {
      setPhase("error");
      setError(
        parsed.kind === "error"
          ? parsed.error
          : "Model scan failed. Ensure API keys are set for vision, or try Text scan."
      );
      return;
    }

    const body = parsed.data as ScanV2PipelineSuccessDTO & Record<string, unknown>;

    if (
      !body.scan_event_id ||
      !body.card ||
      !body.auto_match ||
      !body.ocr_v1_5 ||
      !body.vision_model ||
      !body.fusion
    ) {
      setPhase("error");
      setError("Unexpected response from server.");
      return;
    }

    if (runId !== scanV2SeqRef.current) return;

    setResult(body as ScanV2PipelineSuccessDTO);
    setPhase("result");
  };

  const reset = () => {
    applyFile(null);
    applyBackFile(null);
    setPhase("idle");
    setError(null);
    setResult(null);
    setSelectedMatchId(null);
    setLoadingDetail(null);
  };

  const best = result?.auto_match?.best_match ?? null;
  const ocrSuggestions = (result?.ocr_v1_5?.auto_match?.matches ?? []).slice(0, 5);
  const selectedMatch =
    selectedMatchId != null
      ? result?.auto_match?.matches?.find((m) => m.catalog_card_id === selectedMatchId) ?? best
      : best;

  const continueHref =
    result && binderId.trim()
      ? buildAddCardHref(binderId.trim(), result.card, selectedMatch ?? null, result.scan_event_id)
      : "";

  const visionBand = result
    ? confidenceBand(result.vision_model.overall_confidence)
    : "weak";

  return (
    <div className="space-y-mca-section">
      <header className="space-y-mca-compact">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
          Scanning v2.5
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          Model scan
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Vision model plus OCR v1.5 and catalog fusion. v2.5 adds qualitative holo, rarity, centering,
          and surface hints from the photo (not a grade). When image decoding fails, the server falls
          back to the v2 payload without those extras.
        </p>
        <nav className="flex flex-wrap gap-mca-md pt-mca-sm text-sm" aria-label="Scan navigation">
          <Link
            href="/scan/text"
            className="font-medium text-mca-ink-muted transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Text scan (v1.5)
          </Link>
          <Link
            href="/scan"
            className="font-medium text-mca-ink-muted transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Vision scan (legacy)
          </Link>
        </nav>
      </header>

      {visionConfigured === false ? (
        <aside
          className="max-w-4xl rounded-mca-card border border-mca-warning-surface-border/50 bg-mca-warning-surface/20 p-mca-md text-sm text-mca-ink-body"
          role="status"
        >
          <p className="font-semibold text-mca-ink-strong">Vision model not configured</p>
          <p className="mt-mca-xs text-mca-ink-muted">
            Set <code className="text-xs text-mca-ink-muted">SCAN_V2_OPENAI_API_KEY</code> or{" "}
            <code className="text-xs text-mca-ink-muted">OPENAI_API_KEY</code> on the server. Until
            then, a stub runs and OCR + catalog drive prefills.
          </p>
        </aside>
      ) : null}

      <Panel
        elevated
        className="max-w-4xl border border-mca-border bg-mca-surface-elevated/40 p-mca-lg transition-colors duration-200 ease-mca-standard"
      >
        <div className="space-y-mca-md">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose front card image"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              applyFile(f);
            }}
          />
          <input
            ref={backInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose optional back card image"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              applyBackFile(f);
            }}
          />

          <div className="grid gap-mca-md sm:grid-cols-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-mca-card border border-dashed border-mca-border-subtle bg-mca-surface/40 px-mca-md py-mca-lg text-center transition duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/30 focus-visible:outline focus-visible:ring-2 focus-visible:ring-mca-focus/60"
            >
              <span className="text-sm font-semibold text-mca-ink-strong">Front image</span>
              <span className="mt-mca-xs text-xs text-mca-ink-subtle">Required · up to 15 MB</span>
            </button>
            <button
              type="button"
              onClick={() => backInputRef.current?.click()}
              className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-mca-card border border-dashed border-mca-border-subtle bg-mca-surface/30 px-mca-md py-mca-lg text-center transition duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/30 focus-visible:outline focus-visible:ring-2 focus-visible:ring-mca-focus/60"
            >
              <span className="text-sm font-semibold text-mca-ink-strong">Back image</span>
              <span className="mt-mca-xs text-xs text-mca-ink-subtle">Optional</span>
            </button>
          </div>

          {(previewUrl || backPreviewUrl) && (
            <div className="grid gap-mca-md sm:grid-cols-2">
              {previewUrl ? (
                <div className="space-y-mca-xs">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                    Front preview
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Front of card"
                    className="max-h-56 w-full rounded-mca-card border border-mca-border object-contain transition-opacity duration-200 ease-mca-standard"
                  />
                </div>
              ) : null}
              {backPreviewUrl ? (
                <div className="space-y-mca-xs">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                    Back preview
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={backPreviewUrl}
                    alt="Back of card"
                    className="max-h-56 w-full rounded-mca-card border border-mca-border object-contain transition-opacity duration-200 ease-mca-standard"
                  />
                </div>
              ) : null}
            </div>
          )}

          {error ? <InlineError className="text-sm">{error}</InlineError> : null}

          <div className="flex flex-wrap gap-mca-sm">
            <Button
              type="button"
              variant="primary"
              disabled={!file || phase === "loading"}
              onClick={() => void runScan()}
              className="inline-flex min-w-[8rem] items-center justify-center gap-mca-sm"
            >
              {phase === "loading" ? (
                <>
                  <LoadingSpinner className="size-4 text-mca-on-accent" aria-hidden />
                  <span>Scanning…</span>
                </>
              ) : (
                "Run model scan"
              )}
            </Button>
            <Button type="button" variant="secondary" disabled={phase === "loading"} onClick={reset}>
              Clear all
            </Button>
          </div>

          {phase === "loading" ? (
            <p className="text-sm text-mca-ink-muted" aria-live="polite" aria-busy="true">
              {loadingDetail ??
                "Calling the vision API and merging with OCR — this may take up to a minute."}
            </p>
          ) : null}
        </div>
      </Panel>

      <section
        className={cn(
          "max-w-4xl space-y-mca-lg transition-opacity duration-200 ease-mca-standard",
          phase === "result" && result
            ? "opacity-100"
            : "pointer-events-none h-0 overflow-hidden opacity-0"
        )}
        aria-hidden={phase !== "result" || !result}
        aria-labelledby="model-scan-result-heading"
      >
        {phase === "result" && result ? (
          <>
            <h2 id="model-scan-result-heading" className="text-lg font-semibold text-mca-ink-strong">
              Results
            </h2>

            <div
              className={cn(
                "rounded-mca-card border px-mca-md py-mca-sm text-sm",
                result.fusion.fallback_to_ocr_only
                  ? "border-mca-warning-surface-border/60 bg-mca-warning-surface/20 text-mca-ink-body"
                  : "border-mca-accent-border/40 bg-mca-accent-border/10 text-mca-ink-body"
              )}
              role="status"
            >
              {result.fusion.fallback_to_ocr_only ? (
                <>
                  <span className="font-semibold text-mca-ink-strong">OCR + catalog primary.</span>{" "}
                  Hybrid score was low — Add card uses catalog/OCR. Compare the model panel for
                  hints.
                </>
              ) : (
                <>
                  <span className="font-semibold text-mca-ink-strong">Hybrid match.</span> Model and
                  catalog agreed enough (fusion score{" "}
                  <span className="tabular-nums font-medium">
                    {Math.round(result.fusion.fusion_score * 100)}%
                  </span>
                  ).
                  {result.fusion.vision_reinforced_catalog
                    ? " Vision reinforced the catalog pick."
                    : null}
                </>
              )}
            </div>

            {result.visual_intel ? (
              <div className="space-y-mca-sm rounded-mca-card border border-mca-border/70 bg-mca-surface/30 p-mca-md transition-opacity duration-200 ease-mca-standard">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                  Visual intelligence (v2.5)
                </p>
                {result.visual_intel_degraded ? (
                  <p className="text-mca-caption text-mca-ink-muted" role="status">
                    Image was small or border metrics were noisy — treat hints as exploratory.
                  </p>
                ) : null}
                <ul
                  className="flex flex-wrap gap-mca-sm"
                  aria-label="Qualitative card photo hints"
                >
                  <li>
                    <span className="inline-flex items-center gap-mca-xs rounded-mca-control border border-mca-accent-border/35 bg-mca-accent-border/10 px-mca-sm py-mca-xs text-xs font-medium text-mca-ink-strong transition-colors duration-200 ease-mca-standard">
                      <span className="text-mca-ink-subtle">Holo</span>
                      {result.visual_intel.holo.label}
                      <span className="sr-only">
                        {signalConfidenceLabel(result.visual_intel.holo.confidence_band)}
                      </span>
                      <span className="text-mca-caption font-normal text-mca-ink-muted" aria-hidden>
                        · {signalConfidenceLabel(result.visual_intel.holo.confidence_band)}
                      </span>
                    </span>
                  </li>
                  <li>
                    <span className="inline-flex items-center gap-mca-xs rounded-mca-control border border-mca-border bg-mca-chrome/40 px-mca-sm py-mca-xs text-xs font-medium text-mca-ink-strong transition-colors duration-200 ease-mca-standard">
                      <span className="text-mca-ink-subtle">Rarity</span>
                      {result.visual_intel.rarity.label}
                      <span className="sr-only">
                        {signalConfidenceLabel(result.visual_intel.rarity.confidence_band)}
                      </span>
                      <span className="text-mca-caption font-normal text-mca-ink-muted" aria-hidden>
                        · {signalConfidenceLabel(result.visual_intel.rarity.confidence_band)}
                      </span>
                    </span>
                  </li>
                  <li>
                    <span className="inline-flex items-center gap-mca-xs rounded-mca-control border border-mca-border bg-mca-chrome/40 px-mca-sm py-mca-xs text-xs font-medium text-mca-ink-strong transition-colors duration-200 ease-mca-standard">
                      <span className="text-mca-ink-subtle">Centering</span>
                      {result.visual_intel.centering.label}
                      <span className="sr-only">
                        {signalConfidenceLabel(result.visual_intel.centering.confidence_band)}
                      </span>
                      <span className="text-mca-caption font-normal text-mca-ink-muted" aria-hidden>
                        · {signalConfidenceLabel(result.visual_intel.centering.confidence_band)}
                      </span>
                    </span>
                  </li>
                  <li>
                    <span className="inline-flex items-center gap-mca-xs rounded-mca-control border border-mca-border bg-mca-chrome/40 px-mca-sm py-mca-xs text-xs font-medium text-mca-ink-strong transition-colors duration-200 ease-mca-standard">
                      <span className="text-mca-ink-subtle">Surface</span>
                      {result.visual_intel.surface.label}
                      <span className="sr-only">
                        {signalConfidenceLabel(result.visual_intel.surface.confidence_band)}
                      </span>
                      <span className="text-mca-caption font-normal text-mca-ink-muted" aria-hidden>
                        · {signalConfidenceLabel(result.visual_intel.surface.confidence_band)}
                      </span>
                    </span>
                  </li>
                </ul>
                <p className="text-mca-caption text-mca-hint">
                  Surface and centering are heuristics only — always verify with your eyes before
                  trading or grading.
                </p>
                <details className="group rounded-mca-control border border-mca-border/60 bg-mca-surface/20 text-mca-caption text-mca-ink-muted transition-colors duration-200 ease-mca-standard open:border-mca-field-border">
                  <summary className="cursor-pointer select-none px-mca-sm py-mca-xs font-medium text-mca-ink-body outline-none transition duration-200 ease-mca-standard focus-visible:ring-2 focus-visible:ring-mca-focus/60">
                    Fusion metadata
                  </summary>
                  <div className="space-y-mca-md border-t border-mca-border/50 px-mca-sm py-mca-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Holo
                      </p>
                      <dl className="mt-mca-xs grid gap-mca-trace text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-mca-hint">Model / heuristic weights</dt>
                          <dd className="font-mono text-mca-ink-body">
                            {result.visual_intel.holo.fusion.model_weight} /{" "}
                            {result.visual_intel.holo.fusion.heuristic_weight}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-mca-hint">Agreement</dt>
                          <dd className="text-mca-ink-body">
                            {result.visual_intel.holo.fusion.agreement ? "Yes" : "No"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-mca-hint">Specular / contrast / cluster</dt>
                          <dd className="font-mono text-mca-ink-body">
                            {result.visual_intel.holo.fusion.specular_score ?? "—"} ·{" "}
                            {result.visual_intel.holo.fusion.contrast_spike_score ?? "—"} ·{" "}
                            {result.visual_intel.holo.fusion.reflective_cluster_score ?? "—"}
                          </dd>
                        </div>
                        {result.visual_intel.holo.fusion.notes ? (
                          <div className="sm:col-span-2">
                            <dt className="text-mca-hint">Notes</dt>
                            <dd>{result.visual_intel.holo.fusion.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Rarity
                      </p>
                      <dl className="mt-mca-xs grid gap-mca-trace text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-mca-hint">Catalog / vision</dt>
                          <dd className="text-mca-ink-body">
                            {result.visual_intel.rarity.fusion.catalog_rarity ?? "—"} ·{" "}
                            {result.visual_intel.rarity.fusion.vision_rarity ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-mca-hint">Symbol hint</dt>
                          <dd className="text-mca-ink-body">
                            {result.visual_intel.rarity.fusion.symbol_hint} (
                            {result.visual_intel.rarity.fusion.symbol_complexity})
                          </dd>
                        </div>
                        <div>
                          <dt className="text-mca-hint">Catalog ambiguous</dt>
                          <dd className="text-mca-ink-body">
                            {result.visual_intel.rarity.fusion.catalog_ambiguous ? "Yes" : "No"}
                          </dd>
                        </div>
                        {result.visual_intel.rarity.fusion.notes ? (
                          <div className="sm:col-span-2">
                            <dt className="text-mca-hint">Notes</dt>
                            <dd>{result.visual_intel.rarity.fusion.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Centering
                      </p>
                      <dl className="mt-mca-xs grid gap-mca-trace text-xs sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <dt className="text-mca-hint">L / R / T / B border ratios</dt>
                          <dd className="font-mono text-mca-ink-body">
                            {result.visual_intel.centering.fusion.left_border_ratio} ·{" "}
                            {result.visual_intel.centering.fusion.right_border_ratio} ·{" "}
                            {result.visual_intel.centering.fusion.top_border_ratio} ·{" "}
                            {result.visual_intel.centering.fusion.bottom_border_ratio}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-mca-hint">Asymmetry</dt>
                          <dd className="font-mono text-mca-ink-body">
                            {result.visual_intel.centering.fusion.asymmetry_score}
                          </dd>
                        </div>
                        {result.visual_intel.centering.fusion.notes ? (
                          <div className="sm:col-span-2">
                            <dt className="text-mca-hint">Notes</dt>
                            <dd>{result.visual_intel.centering.fusion.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Surface
                      </p>
                      <dl className="mt-mca-xs grid gap-mca-trace text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-mca-hint">Gradient / corner / whitening</dt>
                          <dd className="font-mono text-mca-ink-body">
                            {result.visual_intel.surface.fusion.gradient_energy} ·{" "}
                            {result.visual_intel.surface.fusion.corner_edge_energy} ·{" "}
                            {result.visual_intel.surface.fusion.whitening_score}
                          </dd>
                        </div>
                        {result.visual_intel.surface.fusion.notes ? (
                          <div className="sm:col-span-2">
                            <dt className="text-mca-hint">Notes</dt>
                            <dd>{result.visual_intel.surface.fusion.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </div>
                </details>
              </div>
            ) : null}

            <div className="grid gap-mca-lg lg:grid-cols-2">
              <Panel className="border border-mca-border bg-mca-surface-elevated/35 p-mca-md">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                  Model prediction
                </p>
                <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
                  Provider:{" "}
                  <span className="font-mono text-mca-ink-body">{result.vision_model.provider}</span>
                </p>
                <dl className="mt-mca-md space-y-mca-sm text-sm">
                  <div className="flex justify-between gap-mca-base">
                    <dt className="text-mca-ink-subtle">Set</dt>
                    <dd className="text-right text-mca-ink-strong">
                      {result.vision_model.set_name_guess || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base">
                    <dt className="text-mca-ink-subtle">Set code</dt>
                    <dd className="text-right text-mca-ink-muted">
                      {result.vision_model.set_code_guess || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base">
                    <dt className="text-mca-ink-subtle">Card</dt>
                    <dd className="text-right font-medium text-mca-ink-strong">
                      {result.vision_model.card_name_guess || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base">
                    <dt className="text-mca-ink-subtle">Number</dt>
                    <dd className="text-right text-mca-ink-muted">
                      {result.vision_model.card_number_guess || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base">
                    <dt className="text-mca-ink-subtle">Rarity</dt>
                    <dd className="text-right text-mca-ink-muted">
                      {result.vision_model.rarity_guess || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base">
                    <dt className="text-mca-ink-subtle">Holo</dt>
                    <dd className="text-right text-mca-ink-muted">
                      {holoLabel(result.vision_model.holo_status)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base border-t border-mca-border/60 pt-mca-sm">
                    <dt className="text-mca-ink-subtle">Model confidence</dt>
                    <dd className="text-right">
                      <span className="rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-xs py-mca-trace text-xs font-semibold">
                        {confidenceBandLabel(visionBand)}
                      </span>
                      <span className="ms-mca-sm text-mca-caption text-mca-ink-subtle">
                        {confidenceBandDescription(visionBand)}
                      </span>
                    </dd>
                  </div>
                </dl>
                {result.vision_model.raw_model_notes ? (
                  <p className="mt-mca-md text-mca-caption text-mca-hint">
                    {result.vision_model.raw_model_notes}
                  </p>
                ) : null}
              </Panel>

              <Panel className="border border-mca-border bg-mca-surface-elevated/35 p-mca-md">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                  OCR + catalog (v1.5)
                </p>
                <dl className="mt-mca-md grid gap-mca-sm text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-mca-ink-subtle">Name guess</dt>
                    <dd className="font-medium text-mca-ink-strong">
                      {result.ocr_v1_5.extracted.name_guess || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mca-ink-subtle">Number guess</dt>
                    <dd className="font-medium text-mca-ink-strong">
                      {result.ocr_v1_5.extracted.number_guess || "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-mca-ink-subtle">Set code guess</dt>
                    <dd className="font-medium text-mca-ink-strong">
                      {result.ocr_v1_5.extracted.set_code_guess || "—"}
                    </dd>
                  </div>
                </dl>
                {ocrSuggestions.length > 0 ? (
                  <ul
                    className="mt-mca-md space-y-mca-sm"
                    role="radiogroup"
                    aria-label="OCR catalog suggestions"
                  >
                    {ocrSuggestions.map((m) => {
                      const selected =
                        selectedMatchId != null
                          ? m.catalog_card_id === selectedMatchId
                          : best != null && matchKey(m) === matchKey(best);
                      return (
                        <OcrCatalogSuggestionRow
                          key={m.catalog_card_id ?? m.card_name}
                          candidate={m}
                          selected={selected}
                          onSelect={() => setSelectedMatchId(m.catalog_card_id ?? null)}
                        />
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-mca-md text-sm text-mca-ink-muted">No OCR catalog rows.</p>
                )}
              </Panel>
            </div>

            <Field
              id="model-scan-binder"
              label="Binder for Add card"
              hint="Last binder is remembered on this device."
            >
              <select
                id="model-scan-binder"
                value={binderId}
                onChange={(e) => {
                  const v = e.target.value;
                  setBinderId(v);
                  persistBinderChoice(v);
                }}
                disabled={bindersLoading}
                className="mca-input w-full rounded-mca-control px-mca-sm py-mca-sm text-sm text-mca-body"
              >
                <option value="">Select binder…</option>
                {binders.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {binderError ? (
                <p className="mt-mca-xs text-xs text-mca-error-accent" role="alert">
                  {binderError}
                </p>
              ) : null}
            </Field>

            <div className="flex flex-wrap gap-mca-sm">
              {binderId.trim() && continueHref ? (
                <Link
                  href={continueHref}
                  className={cn(
                    "inline-flex items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent shadow-mca-panel transition duration-200 ease-mca-standard hover:bg-mca-accent/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface"
                  )}
                >
                  Continue to Add card
                </Link>
              ) : (
                <p className="text-sm text-mca-ink-subtle">Select a binder to open Add card.</p>
              )}
              <Button type="button" variant="secondary" onClick={reset}>
                Scan another
              </Button>
            </div>

            <p className="font-mono text-xs text-mca-hint">scan_event_id: {result.scan_event_id}</p>
          </>
        ) : null}
      </section>
    </div>
  );
}
