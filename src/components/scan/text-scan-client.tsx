"use client";

import type { NormalizedCard } from "@/lib/ai/normalize-card";
import {
  confidenceBand,
  confidenceBandDescription,
  confidenceBandLabel,
} from "@/lib/scanning/v1/confidence-label";
import type { ScanTextPipelineSuccessDTO } from "@/lib/dto/scan-add";
import type { AutoMatchCandidate, AutoMatchResult } from "@/lib/types/auto-match";
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
import { useCallback, useEffect, useRef, useState } from "react";

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

type UiPhase = "idle" | "preview" | "loading" | "result" | "error";

export function TextScanClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const scanTextSeqRef = useRef(0);
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
  const [result, setResult] = useState<ScanTextPipelineSuccessDTO | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

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
    if (next && !next.type.startsWith("image/")) {
      return;
    }
    scanTextSeqRef.current += 1;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next && next.type.startsWith("image/") ? next : null);
    setPhase(next ? "preview" : "idle");
    setLoadingDetail(null);
    setError(null);
    setResult(null);
    setSelectedMatchId(null);
  }, []);

  const applyBackFile = useCallback((next: File | null) => {
    if (next && !next.type.startsWith("image/")) {
      return;
    }
    scanTextSeqRef.current += 1;
    setBackPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next ? URL.createObjectURL(next) : null;
    });
    setBackFile(next && next.type.startsWith("image/") ? next : null);
    if (next) {
      setPhase("preview");
    }
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
    const runId = ++scanTextSeqRef.current;
    setPhase("loading");
    setError(null);
    setResult(null);
    setSelectedMatchId(null);
    setLoadingDetail("Preparing images…");

    const fd = new FormData();
    fd.append("image", file);
    if (backFile) {
      fd.append("image_back", backFile);
    }

    const tid = window.setTimeout(() => {
      setLoadingDetail("Running OCR and catalog match…");
    }, 320);

    let res: Response;
    try {
      res = await fetchWithRetry("/api/scan/v1", { method: "POST", body: fd });
    } catch {
      window.clearTimeout(tid);
      if (runId !== scanTextSeqRef.current) return;
      setLoadingDetail(null);
      setPhase("error");
      setError("Network error — check your connection and try again.");
      return;
    }
    window.clearTimeout(tid);
    if (runId !== scanTextSeqRef.current) return;

    const parsed = await readResponseJson<
      ScanTextPipelineSuccessDTO & Record<string, unknown>
    >(res);

    if (runId !== scanTextSeqRef.current) return;

    setLoadingDetail(null);

    if (res.status === 429) {
      setPhase("error");
      setError("Too many scans right now. Wait a moment and try again.");
      return;
    }

    if (parsed.kind !== "ok") {
      setPhase("error");
      if (parsed.kind === "error") {
        const msg =
          parsed.error ||
          (res.status === 403
            ? "Scan not allowed for your plan or limit reached."
            : "Text scan failed.");
        setError(
          parsed.code === "SCAN_LIMIT_EXHAUSTED"
            ? `${msg} You can upgrade your plan or add a scan pack from Tier & billing.`
            : msg
        );
      } else {
        setError("Text scan failed.");
      }
      return;
    }

    const body = parsed.data;

    if (
      !body.scan_event_id ||
      !body.card ||
      !body.extracted ||
      !body.auto_match
    ) {
      setPhase("error");
      setError("Unexpected response from server.");
      return;
    }

    if (runId !== scanTextSeqRef.current) return;

    const pipeline =
      (body.scan_pipeline as ScanTextPipelineSuccessDTO["scan_pipeline"]) ?? "text_ocr_v1_5";

    setResult({
      success: true,
      scan_pipeline: pipeline,
      card: body.card,
      scan_event_id: body.scan_event_id,
      extracted: body.extracted,
      auto_match: body.auto_match,
      raw_ai: null,
      had_back_image: Boolean(body.had_back_image),
    });
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
  const suggestions = (result?.auto_match?.matches ?? []).slice(0, 6);
  const selectedMatch =
    selectedMatchId != null
      ? suggestions.find((m) => m.catalog_card_id === selectedMatchId) ?? best
      : best;

  const continueHref =
    result && binderId.trim()
      ? buildAddCardHref(binderId.trim(), result.card, selectedMatch ?? null, result.scan_event_id)
      : "";

  return (
    <div className="space-y-mca-section">
      <header className="space-y-mca-compact">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
          Scanning v1.5
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          Text scan
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Upload a clear front photo (optional back for set text). We auto-orient, trim edges,
          normalize contrast, run OCR, then merge catalog suggestions with readable confidence.
        </p>
        <nav className="flex flex-wrap gap-mca-md pt-mca-sm text-sm" aria-label="Scan navigation">
          <Link
            href="/scan"
            className="font-medium text-mca-ink-muted transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            ← Vision scan
          </Link>
          <Link
            href="/scan/v2"
            className="font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Model scan (v2)
          </Link>
        </nav>
      </header>

      <Panel
        elevated
        className="max-w-2xl border border-mca-border bg-mca-surface-elevated/40 p-mca-lg transition-colors duration-200 ease-mca-standard"
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
              <span className="mt-mca-xs text-xs text-mca-ink-subtle">Optional · set info & fine print</span>
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
                    alt="Front of card for OCR"
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
                    alt="Back of card for OCR"
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
                "Run text scan"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={phase === "loading"}
              onClick={reset}
            >
              Clear all
            </Button>
          </div>

          {phase === "loading" ? (
            <p className="text-sm text-mca-ink-muted" aria-live="polite" aria-busy="true">
              {loadingDetail ??
                "Reading text from your image and matching the catalog — first OCR load can take up to a minute."}
            </p>
          ) : null}
        </div>
      </Panel>

      <section
        className={cn(
          "max-w-2xl space-y-mca-lg transition-opacity duration-200 ease-mca-standard",
          phase === "result" && result ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0"
        )}
        aria-hidden={phase !== "result" || !result}
        aria-labelledby="text-scan-result-heading"
      >
        {phase === "result" && result ? (
          <>
            <h2 id="text-scan-result-heading" className="text-lg font-semibold text-mca-ink-strong">
              Review matches
            </h2>

            {result.had_back_image ? (
              <p className="text-xs text-mca-ink-subtle" role="status">
                Back image was included in OCR.
              </p>
            ) : null}

            <Panel className="border border-mca-border bg-mca-surface-elevated/35 p-mca-md">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                Extracted (OCR)
              </p>
              <dl className="mt-mca-sm grid gap-mca-sm text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-mca-ink-subtle">Name guess</dt>
                  <dd className="font-medium text-mca-ink-strong">
                    {result.extracted.name_guess || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-mca-ink-subtle">Number guess</dt>
                  <dd className="font-medium text-mca-ink-strong">
                    {result.extracted.number_guess || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-mca-ink-subtle">Set code guess</dt>
                  <dd className="font-medium text-mca-ink-strong">
                    {result.extracted.set_code_guess || "—"}
                  </dd>
                </div>
              </dl>
            </Panel>

            {suggestions.length > 0 ? (
              <div className="space-y-mca-sm">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                  Catalog suggestions
                </p>
                <ul
                  className="space-y-mca-sm"
                  role="radiogroup"
                  aria-label="Catalog match suggestions"
                >
                  {suggestions.map((m) => {
                    const id = m.catalog_card_id ?? m.card_name;
                    const band = confidenceBand(m.confidence);
                    const selected =
                      selectedMatchId != null
                        ? m.catalog_card_id === selectedMatchId
                        : best != null && matchKey(m) === matchKey(best);
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSelectedMatchId(m.catalog_card_id ?? null)}
                          className={cn(
                            "flex w-full gap-mca-md rounded-mca-card border p-mca-md text-left transition duration-200 ease-mca-standard focus-visible:outline focus-visible:ring-2 focus-visible:ring-mca-focus/60",
                            selected
                              ? "border-mca-accent-border/60 bg-mca-accent-border/10"
                              : "border-mca-border bg-mca-surface/40 hover:border-mca-field-border hover:bg-mca-chrome/25"
                          )}
                        >
                          <div className="relative h-24 w-[4.25rem] shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface">
                            {m.image_url ? (
                              <RemoteCardThumb
                                src={m.image_url}
                                alt=""
                                sizes="72px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-mca-hint">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-mca-ink-strong">{m.card_name}</p>
                            <p className="mt-mca-xs text-xs text-mca-ink-muted">
                              {m.set_name} · #{m.number}
                              {m.rarity ? ` · ${m.rarity}` : ""}
                            </p>
                            <p className="mt-mca-xs">
                              <span className="rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-xs py-mca-trace text-xs font-semibold text-mca-ink-body">
                                {confidenceBandLabel(band)}
                              </span>
                              <span className="ms-mca-sm text-mca-caption text-mca-ink-subtle">
                                {confidenceBandDescription(band)}
                              </span>
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="rounded-mca-card border border-mca-border bg-mca-surface/50 p-mca-md text-sm text-mca-ink-muted">
                No catalog suggestions. You can still add the card manually from the OCR guesses
                above.
              </p>
            )}

            <Field
              id="text-scan-binder"
              label="Binder for Add card"
              hint="Your last choice is remembered on this device. Pick where to open the prefilled form."
            >
              <select
                id="text-scan-binder"
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

            <p className="font-mono text-xs text-mca-hint">
              scan_event_id: {result.scan_event_id}
            </p>
          </>
        ) : null}
      </section>

      <Panel className="max-w-2xl border border-dashed border-mca-border-subtle bg-mca-surface/30 p-mca-md">
        <p className="text-sm font-semibold text-mca-ink-strong">Scanning v2 — model + hybrid</p>
        <p className="mt-mca-xs text-sm text-mca-ink-muted">
          For vision model recognition merged with this OCR pipeline, open{" "}
          <Link
            href="/scan/v2"
            className="font-medium text-mca-accent-strong/90 underline-offset-2 transition duration-200 ease-mca-standard hover:underline"
          >
            Model scan
          </Link>
          . Capabilities: GET <code className="text-xs text-mca-ink-muted">/api/scan/v2</code>.
        </p>
      </Panel>
    </div>
  );
}
