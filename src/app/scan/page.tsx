"use client";

import { SeasonalActivityPulse } from "@/components/activity-waves/seasonal-activity-pulse";
import { SeasonalEventLiveBannerScan } from "@/components/seasonal/seasonal-event-live-banner";
import { listActiveSeasonalEvents } from "@/lib/events/seasonal-events";
import { FtueOverlay } from "@/components/onboarding/ftue-overlay";
import { TierFeatureGateBadge } from "@/components/tier/tier-feature-gate-badge";
import type { ScanPackOffer } from "@/components/billing/scan-pack-purchase-panel";
import { ScanPackLimitModal } from "@/components/scan/scan-pack-limit-modal";
import {
  ScanUpgradeModal,
  parseScanTierFeatureBlockError,
  type ScanUpgradeReason,
} from "@/components/scan/scan-upgrade-modal";
import { requestBinderSurfacesRefresh } from "@/lib/binders/binder-surfaces-refresh";
import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import type { NormalizedCard } from "@/lib/ai/normalize-card";
import type {
  AddCardToBinderDTO,
  ScanLegacyErrorBodyDTO,
  ScanResultDTO,
} from "@/lib/dto/scan-add";
import type { AutoMatchCandidate, AutoMatchResult } from "@/lib/types/auto-match";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { LKG_KEY, lkgGet, lkgSet } from "@/lib/offline/surface-lkg";
import { useListRenderStats, useSuspenseProfile } from "@/lib/telemetry";
import { listScanPackDefinitions } from "@/lib/billing/scan-packs-config";
import Link from "next/link";
import {
  isFreeScanTier,
  isPriorityQueueTier,
  scanTierBucket,
} from "@/lib/tier/scan-tier-policy";
import type { UserTierRecord } from "@/lib/tier/check-limits";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SCAN_TEL = { componentName: "ScanPage", surfaceName: "scan" } as const;

type BinderListItem = { id: string; name: string };

type BinderCardFields = NormalizedCard & {
  catalog_card_id?: string | null;
  set_name?: string | null;
};

function effectiveCardForBinder(
  normalized: NormalizedCard,
  autoMatch?: AutoMatchResult | null
): BinderCardFields {
  const bm = autoMatch?.best_match;
  if (!bm) {
    return { ...normalized, catalog_card_id: null, set_name: null };
  }
  const num =
    bm.number.trim() && bm.number !== "—"
      ? bm.number.trim()
      : normalized.number;
  return {
    name: bm.card_name.trim() || normalized.name,
    number: num,
    rarity: (bm.rarity?.trim() || normalized.rarity) ?? "",
    image_url: bm.image_url ?? normalized.image_url,
    catalog_card_id: bm.catalog_card_id ?? null,
    set_name: bm.set_name?.trim() || null,
  };
}

function buildAddCardHref(
  binderId: string,
  card: BinderCardFields,
  scanEventId?: string
): string {
  const q = new URLSearchParams();
  if (card.name) q.set("name", card.name);
  if (card.number) q.set("number", card.number);
  if (card.rarity) q.set("rarity", card.rarity);
  if (card.image_url) q.set("image_url", card.image_url);
  if (card.catalog_card_id) {
    q.set("catalog_card_id", card.catalog_card_id);
  }
  if (card.set_name?.trim()) {
    q.set("set_name", card.set_name.trim());
  }
  if (scanEventId) q.set("scan_event_id", scanEventId);
  const qs = q.toString();
  return qs.length > 0
    ? `/binders/${encodeURIComponent(binderId)}/add-card?${qs}`
    : `/binders/${encodeURIComponent(binderId)}/add-card`;
}

function buildUseMatchHref(
  binderId: string,
  match: AutoMatchCandidate,
  scanEventId: string
): string {
  const q = new URLSearchParams();
  q.set("name", match.card_name);
  if (match.number && match.number !== "—") {
    q.set("number", match.number);
  }
  if (match.rarity) q.set("rarity", match.rarity);
  if (match.image_url) q.set("image_url", match.image_url);
  if (match.catalog_card_id) {
    q.set("catalog_card_id", match.catalog_card_id);
  }
  if (match.set_name?.trim()) {
    q.set("set_name", match.set_name.trim());
  }
  q.set("scan_event_id", scanEventId);
  return `/binders/${encodeURIComponent(binderId)}/add-card?${q}`;
}

export default function ScanPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanRunSeqRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bindersLoading, setBindersLoading] = useState(true);
  const [binders, setBinders] = useState<BinderListItem[]>([]);
  const [binderError, setBinderError] = useState<string | null>(null);
  const [selectedBinderId, setSelectedBinderId] = useState("");
  const [attachBinderId, setAttachBinderId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [lastSuccess, setLastSuccess] = useState<ScanResultDTO | null>(null);
  const [lastRawJson, setLastRawJson] = useState<string | null>(null);
  const [savedWithBinder, setSavedWithBinder] = useState(false);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachNameOverride, setAttachNameOverride] = useState("");
  const [tierRow, setTierRow] = useState<UserTierRecord | null>(null);
  const [tierStatusLoading, setTierStatusLoading] = useState(true);
  const [autoCrop, setAutoCrop] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [priorityQueue, setPriorityQueue] = useState(false);
  const [batchQueue, setBatchQueue] = useState<File[]>([]);
  const [upgradeReason, setUpgradeReason] = useState<ScanUpgradeReason | null>(null);
  const [atScanLimitFromApi, setAtScanLimitFromApi] = useState(false);
  const [stripeCheckoutAvailable, setStripeCheckoutAvailable] = useState(false);
  const [scanPackLimitModalOpen, setScanPackLimitModalOpen] = useState(false);

  const telemetryCtx = useMemo(
    () => ({
      componentName: "ScanPage",
      surfaceName: "scan",
    }),
    []
  );

  const pulseSeason = useMemo(() => listActiveSeasonalEvents()[0], []);
  useSuspenseProfile("scan", telemetryCtx);
  useListRenderStats("scan-binders", binders.length, telemetryCtx);

  const tierBucket = scanTierBucket(tierRow);
  const showPaidScanTools = !tierStatusLoading && !isFreeScanTier(tierRow);
  const showEliteQueue = showPaidScanTools && isPriorityQueueTier(tierRow);

  const scanPackOffers: ScanPackOffer[] = useMemo(
    () =>
      listScanPackDefinitions().map((d) => ({
        id: d.id,
        label: d.label,
        blurb: d.blurb,
        bonusScans: d.bonusScans,
        priceLabel: `$${(d.fallbackPriceCents / 100).toFixed(2)}`,
      })),
    []
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setTierStatusLoading(true);
      try {
        const res = await fetch("/api/tier/status", { cache: "no-store" });
        const raw = await res.json().catch(() => ({}));
        const body = extractApiPayload(raw) as {
          tier?: UserTierRecord | null;
          at_scan_limit?: boolean;
          stripe_checkout_available?: boolean;
        } | null;
        if (!cancelled && res.ok && body) {
          setAtScanLimitFromApi(Boolean(body.at_scan_limit));
          setStripeCheckoutAvailable(Boolean(body.stripe_checkout_available));
        } else if (!cancelled) {
          setAtScanLimitFromApi(false);
          setStripeCheckoutAvailable(false);
        }
        if (!cancelled && res.ok && body?.tier?.tier_slug) {
          setTierRow(body.tier);
        } else if (!cancelled && res.ok && body?.tier) {
          setTierRow(body.tier);
        } else if (!cancelled) {
          setTierRow(null);
        }
      } finally {
        if (!cancelled) setTierStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const snap = lkgGet<{
      lastSuccess: ScanResultDTO;
      lastRawJson: string | null;
      savedWithBinder: boolean;
    }>(LKG_KEY.scanLast);
    if (snap?.lastSuccess?.card && snap.lastSuccess.scan_event_id) {
      setLastSuccess(snap.lastSuccess);
      if (typeof snap.lastRawJson === "string") {
        setLastRawJson(snap.lastRawJson);
      }
      setSavedWithBinder(Boolean(snap.savedWithBinder));
      mcaLog.event("offline.lkg.restore", { surface: "scan" }, SCAN_TEL);
    }
  }, []);

  useEffect(() => {
    if (!lastSuccess) return;
    lkgSet(LKG_KEY.scanLast, {
      lastSuccess,
      lastRawJson,
      savedWithBinder,
    });
  }, [lastSuccess, lastRawJson, savedWithBinder]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBindersLoading(true);
      setBinderError(null);
      const res = await fetch("/api/binders", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (cancelled) return;
      setBindersLoading(false);
      if (!res.ok) {
        setBinderError(
          extractApiErrorMessage(payload) ?? "Could not load binders."
        );
        return;
      }
      const data = extractApiPayload(payload) ?? (payload as Record<string, unknown>);
      const list = (Array.isArray(data.binders) ? data.binders : []) as {
        id: string;
        name: string;
      }[];
      setBinders(
        list.map((b) => ({
          id: b.id,
          name: typeof b.name === "string" ? b.name : "Binder",
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyFile = useCallback((next: File | null) => {
    if (next && !next.type.startsWith("image/")) {
      return;
    }
    scanRunSeqRef.current += 1;
    setLoading(false);
    setLastSuccess(null);
    setMessage(null);
    setLastRawJson(null);
    setSavedWithBinder(false);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next && next.type.startsWith("image/") ? next : null);
  }, []);

  const ingestImageFiles = useCallback(
    (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) return;
      if (tierStatusLoading) return;
      if (isFreeScanTier(tierRow)) {
        if (imgs.length > 1) {
          setUpgradeReason("multi_drop");
          applyFile(imgs[0] ?? null);
          return;
        }
        setBatchQueue([]);
        applyFile(imgs[0] ?? null);
        return;
      }
      if (imgs.length === 1) {
        setBatchQueue([]);
        applyFile(imgs[0] ?? null);
        return;
      }
      setBatchQueue(imgs);
      applyFile(imgs[0] ?? null);
    },
    [applyFile, tierRow, tierStatusLoading]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (list.length === 0) return;
    if (tierStatusLoading) return;
    if (isFreeScanTier(tierRow) && list.length > 1) {
      setUpgradeReason("multi_drop");
      const first = list.find((f) => f.type.startsWith("image/"));
      if (first) applyFile(first);
      return;
    }
    ingestImageFiles(list);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    ingestImageFiles(picked);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const runScan = async () => {
    if (!file || loading) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      mcaLog.event("offline.action.blocked", { action: "scan.run" }, SCAN_TEL);
      setMessageTone("error");
      setMessage("You're offline — connect to the network to run a scan.");
      return;
    }
    const runId = ++scanRunSeqRef.current;
    setLoading(true);
    setMessage(null);
    setLastSuccess(null);
    setLastRawJson(null);
    setSavedWithBinder(false);
    setAttachNameOverride("");

    const hadBinder = selectedBinderId.trim().length > 0;

    const form = new FormData();
    form.append("image", file);
    if (hadBinder) {
      form.append("binder_id", selectedBinderId.trim());
    }
    if (showPaidScanTools) {
      if (autoCrop) form.append("auto_crop", "1");
      if (autoRotate) form.append("auto_rotate", "1");
      if (showEliteQueue && priorityQueue) form.append("queue_priority", "1");
    }

    const res = await fetchWithRetry("/api/scan", {
      method: "POST",
      body: form,
    });

    const payloadUnknown = await res.json().catch(() => ({}));
    if (runId !== scanRunSeqRef.current) {
      return;
    }
    setLoading(false);

    if (!res.ok) {
      setMessageTone("error");
      const errBody = payloadUnknown as ScanLegacyErrorBodyDTO;
      const err =
        typeof errBody.error === "string" ? errBody.error : "Scan failed.";
      setMessage(err);
      const errCode =
        typeof errBody.code === "string" ? errBody.code : undefined;
      if (errCode === "SCAN_LIMIT_EXHAUSTED") {
        setScanPackLimitModalOpen(true);
        setAtScanLimitFromApi(true);
      }
      const tierFeatureReason = parseScanTierFeatureBlockError(res.status, err, {
        responseCode: errCode,
      });
      if (tierFeatureReason) {
        setUpgradeReason(tierFeatureReason);
      }

      if (errBody.scan_event_id && errBody.card) {
        const rawAi = errBody.raw_ai;
        setLastSuccess({
          success: true,
          card: errBody.card,
          scan_event_id: errBody.scan_event_id,
          raw_ai: rawAi,
          auto_match: errBody.auto_match,
        });
        setLastRawJson(
          JSON.stringify(
            {
              error: err,
              scan_event_id: errBody.scan_event_id,
              raw_ai: rawAi,
              card: errBody.card,
              auto_match: errBody.auto_match,
            },
            null,
            2
          )
        );
      }
      return;
    }

    const ok = payloadUnknown as ScanResultDTO;
    if (!ok.success || !ok.scan_event_id || !ok.card) {
      setMessageTone("error");
      setMessage("Unexpected response from server.");
      return;
    }

    setMessageTone("info");
    setMessage(
      hadBinder
        ? "Scan complete — card saved to your binder."
        : "Scan complete — review fields below or add to a binder."
    );
    mcaLog.event(
      "scan.run.success",
      {
        withBinder: hadBinder,
        hasBestMatch: Boolean(ok.auto_match?.best_match),
      },
      SCAN_TEL
    );
    setLastSuccess(ok);
    setSavedWithBinder(hadBinder);
    setLastRawJson(
      JSON.stringify(
        {
          raw_ai: ok.raw_ai,
          normalized: ok.card,
          scan_event_id: ok.scan_event_id,
          auto_match: ok.auto_match,
        },
        null,
        2
      )
    );

    void (async () => {
      const tierRun = runId;
      try {
        const tr = await fetch("/api/tier/status", { cache: "no-store" });
        const raw = await tr.json().catch(() => ({}));
        const b = extractApiPayload(raw) as {
          tier?: UserTierRecord | null;
          at_scan_limit?: boolean;
          stripe_checkout_available?: boolean;
        } | null;
        if (tierRun !== scanRunSeqRef.current) return;
        if (tr.ok && b) {
          setAtScanLimitFromApi(Boolean(b.at_scan_limit));
          setStripeCheckoutAvailable(Boolean(b.stripe_checkout_available));
          if (b.tier) {
            setTierRow(b.tier);
          }
        }
      } catch {
        /* ignore */
      }
    })();

    if (runId !== scanRunSeqRef.current) {
      return;
    }

    if (showPaidScanTools) {
      setBatchQueue((prev) => {
        if (prev.length <= 1) return [];
        const next = prev.slice(1);
        const nf = next[0];
        if (nf) {
          requestAnimationFrame(() => applyFile(nf));
        }
        return next;
      });
    }
  };

  const addScanToBinder = async () => {
    if (!lastSuccess) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      mcaLog.event("offline.action.blocked", { action: "scan.add_to_binder" }, SCAN_TEL);
      setMessageTone("error");
      setMessage("You're offline — reconnect to add this card to a binder.");
      return;
    }
    const bid = attachBinderId.trim();
    if (!bid) {
      setMessageTone("error");
      setMessage("Choose a binder first.");
      return;
    }

    const merged = effectiveCardForBinder(
      lastSuccess.card,
      lastSuccess.auto_match
    );
    const name =
      (attachNameOverride.trim() || merged.name.trim()) || "";
    if (!name) {
      setMessageTone("error");
      setMessage("Card name is required — enter a name above.");
      return;
    }

    setAttachLoading(true);
    setMessage(null);

    const body: AddCardToBinderDTO = {
      binder_id: bid,
      name,
      number: merged.number.trim() || null,
      rarity: merged.rarity.trim() || null,
      image_url: merged.image_url,
      scan_event_id: lastSuccess.scan_event_id,
      ...(merged.catalog_card_id
        ? { catalog_card_id: merged.catalog_card_id }
        : {}),
    };

    const res = await fetchWithRetry("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));
    setAttachLoading(false);

    if (!res.ok) {
      setMessageTone("error");
      setMessage(
        typeof payload.error === "string"
          ? payload.error
          : "Could not add card to binder."
      );
      return;
    }

    requestBinderSurfacesRefresh(bid);
    setMessageTone("info");
    setMessage("Card added and linked to this scan.");
    setSavedWithBinder(true);
    router.push(`/binders/${bid}`);
    router.refresh();
  };

  const cardForDisplay = lastSuccess?.card;
  const bestMatch = lastSuccess?.auto_match?.best_match ?? null;
  const binderForLinks =
    attachBinderId.trim() || selectedBinderId.trim() || "";

  return (
    <div className="space-y-mca-2xl">
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-busy={loading || attachLoading}
        aria-atomic="true"
      >
        {loading
          ? "Scan in progress."
          : attachLoading
            ? "Adding card to binder."
            : message ?? ""}
      </div>
      <header className="space-y-mca-compact">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
          Capture
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          Scan a Card
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Upload a photo. The server runs vision (mock or live), auto-match
          against catalog hints, records a{" "}
          <code className="rounded bg-mca-chrome/80 px-mca-micro py-mca-trace text-xs">scan_events</code>{" "}
          row, and optionally creates a{" "}
          <code className="rounded bg-mca-chrome/80 px-mca-micro py-mca-trace text-xs">cards</code> row when
          a binder is selected.
        </p>
        <nav
          className="flex flex-wrap gap-mca-md pt-mca-sm text-sm"
          aria-label="Scanning modes"
        >
          <Link
            href="/scan/text"
            className="font-semibold text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Text scan (OCR + catalog)
          </Link>
          <Link
            href="/scan/v2"
            className="font-semibold text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Model scan (v2.5)
          </Link>
        </nav>
        {!tierStatusLoading ? (
          <p className="text-xs text-mca-ink-subtle">
            Scan mode ·{" "}
            <span className="font-medium text-mca-ink-muted">
              {tierBucket === "free"
                ? "Free (manual, single image)"
                : tierBucket === "pro"
                  ? "Pro"
                  : tierBucket === "elite"
                    ? "Elite"
                    : tierBucket === "business"
                      ? "Business"
                      : "Free (default)"}
            </span>
          </p>
        ) : (
          <p className="text-xs text-mca-ink-subtle">Loading plan…</p>
        )}
      </header>

      <SeasonalEventLiveBannerScan />

      <aside
        className="max-w-2xl rounded-mca-card border border-dashed border-mca-border-subtle bg-mca-surface/35 p-mca-md"
        aria-label="Scanning v2.5 preview"
      >
        <p className="text-sm font-semibold text-mca-ink-strong">Scanning v2.5</p>
        <p className="mt-mca-xs text-sm text-mca-ink-muted">
          Hybrid vision + OCR + qualitative visual intelligence lives on{" "}
          <Link href="/scan/v2" className="font-medium text-mca-accent-strong/90 hover:underline">
            Model scan
          </Link>{" "}
          (<code className="text-xs text-mca-ink-muted">POST /api/scan/v2</code>). Text-only OCR
          uses <code className="text-xs text-mca-ink-muted">POST /api/scan/v1</code>.
        </p>
      </aside>

      {pulseSeason ? (
        <SeasonalActivityPulse seasonId={pulseSeason.eventId} className="max-w-2xl" />
      ) : null}

      {!tierStatusLoading && atScanLimitFromApi ? (
        <div
          role="region"
          aria-label="Scan limit"
          className="max-w-xl rounded-mca-block border border-mca-accent-strong/35 bg-mca-warning-surface/20 px-mca-comfortable py-mca-base text-sm text-mca-ink-body"
        >
          <p className="font-medium text-mca-ink-strong">
            You&apos;ve used all scans for this month.
          </p>
          <p className="mt-mca-xs text-mca-ink-muted">
            Upgrade for a higher monthly allowance, or buy a scan pack to add bonus scans right away.
          </p>
          <div className="mt-mca-md flex flex-wrap gap-mca-compact">
            <Link
              href="/tier#billing"
              className="inline-flex items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome/70 px-mca-base py-mca-sm text-sm font-semibold text-mca-ink-strong transition hover:bg-mca-border-subtle/60"
            >
              Upgrade plan
            </Link>
            <button
              type="button"
              onClick={() => setScanPackLimitModalOpen(true)}
              className="inline-flex items-center justify-center rounded-mca-control border border-mca-accent-strong/50 bg-mca-accent-border/20 px-mca-base py-mca-sm text-sm font-semibold text-mca-warning-tint transition hover:bg-mca-accent-border/30"
            >
              Buy a scan pack
            </button>
          </div>
        </div>
      ) : null}

      <div className="max-w-xl space-y-mca-sm">
        <label
          htmlFor="scan-binder"
          className="block text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle"
        >
          Binder (optional)
        </label>
        <select
          id="scan-binder"
          value={selectedBinderId}
          onChange={(e) => setSelectedBinderId(e.target.value)}
          disabled={bindersLoading || loading}
          className="mca-input rounded-mca-card px-mca-base py-mca-tight text-sm focus:border-mca-accent-strong/50 focus:ring-mca-accent-strong/25 disabled:opacity-60"
        >
          <option value="">— Scan only (no card yet) —</option>
          {binders.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {binderError ? (
          <p className="text-xs text-mca-accent">{binderError}</p>
        ) : null}
        <p className="text-xs text-mca-ink-subtle">
          If you pick a binder, a card is created and the scan is linked to it.
        </p>
      </div>

      {!tierStatusLoading ? (
        <section
          className="max-w-xl space-y-mca-sm rounded-mca-card border border-mca-border/80 bg-mca-surface-elevated/25 p-mca-md dark:border-mca-border-subtle/80"
          aria-label="Scan capture options"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Capture options
          </p>
          {showPaidScanTools ? (
            <div className="space-y-mca-sm">
              <label className="flex cursor-pointer items-center gap-mca-sm text-sm text-mca-ink-body">
                <input
                  type="checkbox"
                  className="size-4 rounded border-mca-border text-mca-accent-strong focus:ring-mca-focus/50"
                  checked={autoCrop}
                  onChange={(e) => setAutoCrop(e.target.checked)}
                />
                <span>Auto-crop card frame after upload</span>
              </label>
              <label className="flex cursor-pointer items-center gap-mca-sm text-sm text-mca-ink-body">
                <input
                  type="checkbox"
                  className="size-4 rounded border-mca-border text-mca-accent-strong focus:ring-mca-focus/50"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                />
                <span>Auto-rotate image before recognition</span>
              </label>
              {showEliteQueue ? (
                <label className="flex cursor-pointer items-center gap-mca-sm text-sm text-mca-ink-body">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-mca-border text-mca-accent-strong focus:ring-mca-focus/50"
                    checked={priorityQueue}
                    onChange={(e) => setPriorityQueue(e.target.checked)}
                  />
                  <span className="inline-flex items-center gap-mca-xs">Priority scan queue</span>
                </label>
              ) : null}
              <p className="text-xs text-mca-ink-subtle">
                Batch queue: pick multiple images at once — each scan still uses one request and counts
                toward your monthly limit.
              </p>
            </div>
          ) : (
            <ul className="space-y-mca-sm text-sm text-mca-ink-muted">
              <li className="flex items-center justify-between gap-mca-sm opacity-70">
                <span className="inline-flex items-center gap-mca-xs">
                  Auto-crop
                  <TierFeatureGateBadge kind="pro" />
                </span>
                <span className="text-mca-caption text-mca-ink-subtle">Pro</span>
              </li>
              <li className="flex items-center justify-between gap-mca-sm opacity-70">
                <span className="inline-flex items-center gap-mca-xs">
                  Auto-rotate
                  <TierFeatureGateBadge kind="pro" />
                </span>
                <span className="text-mca-caption text-mca-ink-subtle">Pro</span>
              </li>
              <li className="flex items-center justify-between gap-mca-sm opacity-70">
                <span className="inline-flex items-center gap-mca-xs">
                  Batch &amp; multi-file capture
                  <TierFeatureGateBadge kind="pro" />
                </span>
                <span className="text-mca-caption text-mca-ink-subtle">Pro</span>
              </li>
              <li className="flex items-center justify-between gap-mca-sm opacity-70">
                <span className="inline-flex items-center gap-mca-xs">
                  Priority queue
                  <TierFeatureGateBadge kind="elite" />
                </span>
                <span className="text-mca-caption text-mca-ink-subtle">Elite+</span>
              </li>
              <li className="flex items-center justify-between gap-mca-sm opacity-70">
                <span className="inline-flex items-center gap-mca-xs">
                  Collection CSV export
                  <TierFeatureGateBadge kind="business" />
                </span>
                <span className="text-mca-caption text-mca-ink-subtle">Business</span>
              </li>
            </ul>
          )}
        </section>
      ) : null}

      {message ? (
        <p
          className={
            messageTone === "error"
              ? "rounded-mca-card border border-mca-warning-surface-border/60 bg-mca-warning-surface/30 px-mca-base py-mca-compact text-sm text-mca-nav-accent"
              : "rounded-mca-card border border-mca-border-subtle bg-mca-surface-elevated/50 px-mca-base py-mca-compact text-sm text-mca-ink-soft"
          }
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-mca-xl lg:grid-cols-2 lg:gap-mca-section">
        <div className="space-y-mca-base">
          {tierStatusLoading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-mca-sheet border border-dashed border-mca-border/60 bg-mca-surface-elevated/15 px-mca-lg py-mca-xl text-center">
              <p className="text-sm text-mca-ink-muted">Loading your plan…</p>
            </div>
          ) : showPaidScanTools ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop zone: open file picker"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`flex min-h-[220px] cursor-pointer touch-manipulation flex-col items-center justify-center rounded-mca-sheet border-2 border-dashed px-mca-lg py-mca-2xl text-center transition outline-none focus-visible:ring-2 focus-visible:ring-mca-accent-strong/60 ${
                isDragging
                  ? "border-mca-accent-strong/60 bg-mca-warning-surface/20"
                  : "border-mca-border-subtle bg-mca-surface-elevated/30 hover:border-mca-field-border hover:bg-mca-surface-elevated/45"
              }`}
              onClick={openFilePicker}
            >
              <p className="text-sm font-medium text-mca-ink-soft">Drag and drop images</p>
              <p className="mt-mca-sm text-xs text-mca-ink-subtle">
                Pro, Elite, or Business — one or many photos; each scan still uses one server request per
                image.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-mca-sheet border border-mca-border/70 bg-mca-surface-elevated/20 px-mca-lg py-mca-xl text-center">
              <p className="text-sm font-medium text-mca-ink-soft">Free tier · manual upload</p>
              <p className="mt-mca-sm max-w-sm text-xs text-mca-ink-subtle">
                Use the Upload button to choose <span className="font-semibold text-mca-ink-muted">one</span>{" "}
                photo at a time. Drag-and-drop with multiple files is disabled — upgrade to Pro for batch-friendly
                capture.
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={showPaidScanTools}
            className="sr-only"
            onChange={onInputChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Capture card photo with camera"
            onChange={onInputChange}
          />

          <div className="flex flex-wrap gap-mca-compact">
            <button
              type="button"
              onClick={openFilePicker}
              className="inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-sm text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent sm:flex-none"
            >
              {showPaidScanTools ? "Upload images" : "Upload one image"}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={tierStatusLoading}
              className="inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-sm text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-border-interactive disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Use camera
            </button>
            <button
              type="button"
              disabled={loading || !file}
              onClick={runScan}
              className="inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-sm text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-border-interactive disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              {loading ? "Scanning…" : "Run scan"}
            </button>
          </div>
          {file ? (
            <div className="space-y-mca-xs text-xs text-mca-ink-subtle">
              <p>
                Selected:{" "}
                <span className="font-medium text-mca-ink-muted">{file.name}</span>
              </p>
              {batchQueue.length > 1 ? (
                <p className="text-mca-caption text-mca-accent/90">
                  Batch queue · {batchQueue.length} photos (runs one scan per photo)
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-mca-base">
          <div>
            <p className="mb-mca-compact text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle">
              Preview
            </p>
            <div className="relative flex min-h-[280px] flex-1 overflow-hidden rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Selected card preview"
                  className="h-full w-full min-h-[280px] object-contain bg-mca-surface/50"
                />
              ) : (
                <div className="flex w-full flex-col items-center justify-center gap-mca-sm p-mca-xl text-center">
                  <div className="mb-mca-sm aspect-[3/4] w-24 rounded-mca-block border border-dashed border-mca-border-subtle bg-mca-chrome/40" />
                  <p className="text-sm font-medium text-mca-ink-muted">
                    No image yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {lastSuccess && cardForDisplay ? (
        <section className="space-y-mca-lg border-t border-mca-border/80 pt-mca-section">
          <div className="flex flex-wrap items-center justify-between gap-mca-sm">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle">
              Scan results
            </h2>
            {showPaidScanTools && file ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void runScan()}
                className="rounded-mca-control border border-mca-border bg-mca-surface-elevated/60 px-mca-sm py-mca-xs text-mca-caption font-medium text-mca-ink-body transition hover:bg-mca-chrome/40 disabled:opacity-50"
              >
                Scan this photo again
              </button>
            ) : null}
          </div>

          <div className="grid gap-mca-lg lg:grid-cols-2">
            <div className="space-y-mca-compact">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                Auto-match (best guess)
              </p>
              {bestMatch ? (
                <div className="rounded-mca-sheet border border-mca-warning-surface-border/40 bg-mca-warning-surface/15 p-mca-comfortable text-sm">
                  <dl className="space-y-mca-sm">
                    <div className="flex justify-between gap-mca-base border-b border-mca-warning-surface-border/20 py-mca-sm first:pt-0">
                      <dt className="text-mca-nav-accent/70">Name</dt>
                      <dd className="text-right font-medium text-mca-ink-strong">
                        {bestMatch.card_name}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-mca-base border-b border-mca-warning-surface-border/20 py-mca-sm">
                      <dt className="text-mca-nav-accent/70">Set</dt>
                      <dd className="text-right text-mca-ink-soft">
                        {bestMatch.set_name}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-mca-base border-b border-mca-warning-surface-border/20 py-mca-sm">
                      <dt className="text-mca-nav-accent/70">Number</dt>
                      <dd className="text-right text-mca-ink-soft">
                        {bestMatch.number}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-mca-base py-mca-sm last:pb-0">
                      <dt className="text-mca-nav-accent/70">Confidence</dt>
                      <dd className="tabular-nums font-semibold text-mca-accent-highlight/95">
                        {Math.round(
                          Math.max(0, Math.min(1, bestMatch.confidence)) * 100
                        )}
                        %
                      </dd>
                    </div>
                  </dl>
                  {binderForLinks ? (
                    <Link
                      href={buildUseMatchHref(
                        binderForLinks,
                        bestMatch,
                        lastSuccess.scan_event_id
                      )}
                      className="mt-mca-base inline-flex w-full items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-base py-mca-tight text-center text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent"
                    >
                      Use this match
                    </Link>
                  ) : (
                    <p className="mt-mca-compact text-xs text-mca-ink-subtle">
                      Select a binder below (or at the top) to open the add-card
                      form with this match.
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 px-mca-comfortable py-mca-base text-sm text-mca-ink-subtle">
                  No catalog match returned for this scan. Use AI fields below
                  or try another photo.
                </p>
              )}
            </div>

            <div className="space-y-mca-compact">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
                Normalized card (AI)
              </p>
              <dl className="rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 p-mca-comfortable text-sm">
                <div className="flex justify-between gap-mca-base border-b border-mca-border/80 py-mca-sm first:pt-0">
                  <dt className="text-mca-ink-subtle">Name</dt>
                  <dd className="text-right font-medium text-mca-ink-strong">
                    {cardForDisplay.name || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-mca-base border-b border-mca-border/80 py-mca-sm">
                  <dt className="text-mca-ink-subtle">Number</dt>
                  <dd className="text-right text-mca-ink-soft">
                    {cardForDisplay.number || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-mca-base border-b border-mca-border/80 py-mca-sm">
                  <dt className="text-mca-ink-subtle">Rarity</dt>
                  <dd className="text-right text-mca-ink-soft">
                    {cardForDisplay.rarity || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-mca-base py-mca-sm last:pb-0">
                  <dt className="text-mca-ink-subtle">Image URL</dt>
                  <dd className="max-w-[60%] truncate text-right text-mca-accent-strong/90">
                    {cardForDisplay.image_url ?? "—"}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-mca-ink-subtle">
                Scan event id:{" "}
                <span className="font-mono text-mca-ink-muted">
                  {lastSuccess.scan_event_id}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-mca-compact">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle">
              Raw AI output (JSON)
            </p>
            <pre className="max-h-[280px] overflow-auto rounded-mca-sheet border border-mca-border bg-mca-surface/60 p-mca-base text-xs text-mca-ink-body">
              {lastRawJson ?? JSON.stringify(lastSuccess.raw_ai, null, 2)}
            </pre>
          </div>

          {savedWithBinder && selectedBinderId ? (
            <Link
              href={`/binders/${selectedBinderId}`}
              className="inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome"
            >
              Open binder
            </Link>
          ) : null}

          {lastSuccess && !savedWithBinder ? (
            <div className="space-y-mca-base rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/30 p-mca-lg">
              <h3 className="text-sm font-semibold text-mca-ink-soft">
                Add to binder
              </h3>
              <p className="text-sm text-mca-ink-subtle">
                Create a card from this scan and link it to the scan record.
              </p>
              <div className="max-w-md space-y-mca-compact">
                <label
                  htmlFor="attach-binder"
                  className="block text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle"
                >
                  Binder
                </label>
                <select
                  id="attach-binder"
                  value={attachBinderId}
                  onChange={(e) => setAttachBinderId(e.target.value)}
                  disabled={attachLoading}
                  className="mca-input rounded-mca-card px-mca-base py-mca-tight text-sm focus:border-mca-accent-strong/50 focus:ring-mca-accent-strong/25"
                >
                  <option value="">— Select binder —</option>
                  {binders.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {!effectiveCardForBinder(
                  lastSuccess.card,
                  lastSuccess.auto_match
                ).name.trim() ? (
                  <div>
                    <label
                      htmlFor="attach-name"
                      className="block text-xs font-medium uppercase tracking-[0.15em] text-mca-ink-subtle"
                    >
                      Card name (required)
                    </label>
                    <input
                      id="attach-name"
                      value={attachNameOverride}
                      onChange={(e) => setAttachNameOverride(e.target.value)}
                      placeholder="e.g. Charizard"
                      className="mca-input mt-mca-sm rounded-mca-card px-mca-base py-mca-tight text-sm focus:border-mca-accent-strong/50 focus:ring-mca-accent-strong/25"
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-mca-compact">
                  <button
                    type="button"
                    disabled={attachLoading}
                    onClick={addScanToBinder}
                    className="inline-flex items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent disabled:opacity-50"
                  >
                    {attachLoading ? "Saving…" : "Add to binder"}
                  </button>
                  {attachBinderId &&
                  effectiveCardForBinder(
                    lastSuccess.card,
                    lastSuccess.auto_match
                  ).name.trim() ? (
                    <Link
                      href={buildAddCardHref(
                        attachBinderId,
                        effectiveCardForBinder(
                          lastSuccess.card,
                          lastSuccess.auto_match
                        ),
                        lastSuccess.scan_event_id
                      )}
                      className="inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome"
                    >
                      Open add-card form (prefilled)
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <ScanPackLimitModal
        isOpen={scanPackLimitModalOpen}
        onClose={() => setScanPackLimitModalOpen(false)}
        packs={scanPackOffers}
        billingEnabled={stripeCheckoutAvailable}
      />

      <ScanUpgradeModal
        reason={upgradeReason}
        isOpen={upgradeReason != null}
        onClose={() => setUpgradeReason(null)}
      />

      <FtueOverlay
        storageKey="mca:ftue:scan"
        surfaceName="scan"
        title="Scan tips"
      >
        <p>
          Use a well-lit, flat photo of the card front. You can run a scan without a binder, then add to a binder when
          the fields look right. Monthly scan limits follow your plan on the Tier page.
        </p>
      </FtueOverlay>
    </div>
  );
}
