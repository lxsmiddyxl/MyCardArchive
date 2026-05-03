"use client";

import { CardDetailLegalitySection, type PriceHistRow } from "./card-detail-price-section";
import {
  Button,
  Field,
  Icon,
  InlineError,
  InlineSuccess,
  LoadingButton,
  ModalBase,
  Panel,
} from "@/mca-ui";
import { McaIcons } from "@/lib/icons/mca-icons";
import { rarityIconSrc } from "@/lib/icons/rarity";
import type { GradingPayload } from "@/lib/grading/types";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { enqueueOfflineAction, isLikelyOfflineError } from "@/lib/mobile/offline-action-queue";
import { useSuspenseProfile, useListRenderStats } from "@/lib/telemetry";
import { useCallback, useMemo } from "@/lib/perf/memo";
import { GradingNextSteps } from "@/components/flow/grading-next-steps";
import {
  fetchJson,
  fetchJsonErrorMessage,
  readResponseJson,
  useAsyncState,
} from "@/lib/client";
import type {
  CardDetailDTO,
  CardDetailModalBinderDTO,
  CardDetailModalDeckDTO,
  CardDetailApiPayloadDTO,
  CardModalBootstrapDTO,
  CardPatchResponseDTO,
} from "@/lib/dto/card-detail-modal";
import type { DeckCardSlotMutationAckDTO } from "@/lib/dto/deck-import";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";

const CardGradingSectionLazy = lazy(async () => ({
  default: (await import("@/components/grading/card-grading-section")).CardGradingSection,
}));

function resolveFrontHeroSrc(d: CardDetailDTO): string | null {
  const thumb = d.image_front_thumb_url ?? d.image_url;
  const full = d.image_front_full_url;
  if (
    thumb &&
    full &&
    thumb.includes("/cards/") &&
    thumb.includes("front_thumb")
  ) {
    return full;
  }
  return thumb ?? full ?? null;
}

const CardDetailPriceSectionLazy = lazy(async () => ({
  default: (await import("./card-detail-price-section")).CardDetailPriceSection,
}));

type Props = {
  open: boolean;
  cardId: string | null;
  onClose: () => void;
  onChanged?: () => Promise<void> | void;
  /** When true (e.g. global inventory), hide binder/deck mutations; open binder from its page instead. */
  readOnly?: boolean;
};

function DeckLocationRow({
  actionKey,
  deckName,
  zone,
  qty,
  pendingKey,
  onRemove,
}: {
  actionKey: string;
  deckName: string;
  zone: string;
  qty: number;
  pendingKey: string | null;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-mca-block border border-mca-border px-mca-compact py-mca-sm">
      <p className="text-xs text-mca-ink-body">
        <span className="font-medium text-mca-ink-strong">{deckName}</span>
        {" · "}
        {zone}
        {" · qty "}
        {qty}
      </p>
      <LoadingButton
        type="button"
        isLoading={pendingKey === actionKey}
        disabled={pendingKey !== null && pendingKey !== actionKey}
        className="inline-flex items-center gap-mca-sm rounded-mca-control border border-mca-border-subtle px-mca-sm py-mca-micro text-[11px] font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        onClick={onRemove}
      >
        <Icon src={McaIcons.ui.trash} size="sm" alt="" />
        Remove from Deck
      </LoadingButton>
    </div>
  );
}

export function CardDetailModal({
  open,
  cardId,
  onClose,
  onChanged,
  readOnly = false,
}: Props) {
  const {
    data: bootPayload,
    loading: bootstrapLoading,
    error: bootstrapError,
    run: runBootstrap,
    reset: resetBootstrap,
  } = useAsyncState<CardModalBootstrapDTO>();
  const {
    data: priceHistData,
    loading: priceHistoryLoading,
    error: priceHistoryError,
    run: runPriceHistory,
    reset: resetPriceHistory,
  } = useAsyncState<PriceHistRow[]>();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBinderPicker, setShowBinderPicker] = useState(false);
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [selectedBinder, setSelectedBinder] = useState("");
  const [selectedDeck, setSelectedDeck] = useState("");
  const [selectedZone, setSelectedZone] = useState<"main" | "sideboard" | "commander">("main");
  const [backImageFailed, setBackImageFailed] = useState(false);
  const [gradingPayload, setGradingPayload] = useState<GradingPayload | null>(null);
  const [gradingBusy, setGradingBusy] = useState(false);

  const detail = useMemo(
    () => bootPayload?.detail ?? null,
    [bootPayload]
  );
  const binders: CardDetailModalBinderDTO[] = useMemo(
    () => bootPayload?.binders ?? [],
    [bootPayload]
  );
  const decks: CardDetailModalDeckDTO[] = useMemo(
    () => bootPayload?.decks ?? [],
    [bootPayload]
  );
  const priceHistory = useMemo(
    () => priceHistData ?? [],
    [priceHistData]
  );
  const loading = bootstrapLoading;

  const telemetryCtx = useMemo(
    () => ({
      componentName: "CardDetailModal",
      surfaceName: "card-detail",
    }),
    []
  );
  useSuspenseProfile("card-detail-modal", telemetryCtx);
  useListRenderStats(
    "card-deck-locations",
    detail?.deck_locations?.length ?? 0,
    telemetryCtx
  );

  const loadGrading = useCallback(async () => {
    if (!cardId) return;
    setGradingBusy(true);
    try {
      const r = await fetchJson<{ grade?: GradingPayload }>(
        `/api/cards/${encodeURIComponent(cardId)}/grade`,
        { cache: "no-store" }
      );
      if (r.kind === "ok" && r.data.grade) {
        setGradingPayload(r.data.grade);
      } else {
        setGradingPayload(null);
      }
    } catch {
      setGradingPayload(null);
    } finally {
      setGradingBusy(false);
    }
  }, [cardId]);

  const runGradingAnalysis = useCallback(async () => {
    if (!cardId || readOnly) return;
    setGradingBusy(true);
    try {
      const res = await fetchWithRetry(`/api/cards/${encodeURIComponent(cardId)}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const r = await readResponseJson<{ grade?: GradingPayload }>(res);
      if (r.kind === "ok" && r.data.grade) {
        setGradingPayload(r.data.grade);
        mcaLog.event("card.grade.analysis_complete", { cardId }, telemetryCtx);
      }
    } finally {
      setGradingBusy(false);
    }
  }, [cardId, readOnly, telemetryCtx]);

  const load = useCallback(async () => {
    if (!cardId) return;
    setError(null);
    await runBootstrap(async () => {
      const detailR = await fetchJson<CardDetailApiPayloadDTO>(
        `/api/cards/${encodeURIComponent(cardId)}/detail`,
        { cache: "no-store" }
      );
      if (detailR.kind !== "ok") {
        throw new Error(fetchJsonErrorMessage(detailR));
      }

      const nextDetail = detailR.data.card ?? null;

      if (readOnly) {
        setShowBinderPicker(false);
        setShowDeckPicker(false);
        return { detail: nextDetail, binders: [], decks: [] };
      }
      const [bindersR, decksR] = await Promise.all([
        fetchJson<{ binders?: CardDetailModalBinderDTO[] }>("/api/binders", { cache: "no-store" }),
        fetchJson<{ decks?: CardDetailModalDeckDTO[] }>("/api/decks/list", { cache: "no-store" }),
      ]);
      const nextBinders =
        bindersR.kind === "ok" && Array.isArray(bindersR.data.binders) ? bindersR.data.binders : [];
      const nextDecks =
        decksR.kind === "ok" && Array.isArray(decksR.data.decks) ? decksR.data.decks : [];
      setSelectedBinder(nextBinders[0]?.id ?? "");
      setSelectedDeck(nextDecks[0]?.id ?? "");
      return { detail: nextDetail, binders: nextBinders, decks: nextDecks };
    });
  }, [runBootstrap, cardId, readOnly]);

  const loadPriceHistory = useCallback(
    async (id: string) => {
      await runPriceHistory(async () => {
        const r = await fetchJson<{ history?: PriceHistRow[] }>(
          `/api/cards/${encodeURIComponent(id)}/price-history?limit=120`,
          { cache: "no-store" }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        return Array.isArray(r.data.history) ? r.data.history : [];
      });
    },
    [runPriceHistory]
  );

  useEffect(() => {
    if (!open || !cardId) {
      resetBootstrap();
      resetPriceHistory();
      return;
    }
    void load();
    void loadPriceHistory(cardId);
    void loadGrading();
  }, [open, cardId, load, loadGrading, loadPriceHistory, resetBootstrap, resetPriceHistory]);

  useEffect(() => {
    if (!actionSuccess) return;
    const t = window.setTimeout(() => setActionSuccess(null), 3500);
    return () => window.clearTimeout(t);
  }, [actionSuccess]);

  useEffect(() => {
    if (!open) {
      setActionSuccess(null);
      setPendingKey(null);
    }
  }, [open]);

  useEffect(() => {
    setBackImageFailed(false);
  }, [detail?.id]);

  const catalogForLegality = useMemo(() => detail?.catalog ?? null, [detail?.catalog]);

  const frontHeroSrc = useMemo(
    () => (detail ? resolveFrontHeroSrc(detail) : null),
    [detail]
  );

  const backDisplaySrc = useMemo(() => {
    if (!detail) return null;
    return detail.image_back_full_url ?? detail.image_back_thumb_url ?? null;
  }, [detail]);

  return (
    <ModalBase
      isOpen={open && Boolean(cardId)}
      onClose={onClose}
      title="Card details"
      panelClassName="max-w-4xl"
      blockClose={pendingKey !== null}
      bodyClassName="p-0"
    >
      <section
        aria-live="polite"
        aria-busy={loading || gradingBusy || priceHistoryLoading || pendingKey !== null}
      >
      {loading ? (
        <p className="p-mca-lg text-sm text-mca-ink-muted">Loading card details...</p>
      ) : error || bootstrapError ? (
        <div className="p-mca-lg">
          <InlineError showIcon>{error ?? bootstrapError}</InlineError>
        </div>
      ) : !detail ? (
        <p className="p-mca-lg text-sm text-mca-ink-muted">Card not found.</p>
      ) : (
        <div className="grid gap-mca-md p-mca-lg transition-all duration-200 ease-mca-standard lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          {actionSuccess ? (
            <InlineSuccess className="lg:col-span-2" showIcon>
              {actionSuccess}
            </InlineSuccess>
          ) : null}
          <div className="space-y-mca-md min-w-0">
            <Suspense
              fallback={
                <div className="rounded-mca-panel border border-mca-border bg-mca-surface-elevated/50 p-mca-lg text-mca-body text-mca-ink-subtle">
                  Loading grading UI…
                </div>
              }
            >
              <CardGradingSectionLazy
                cardName={detail.name}
                frontHeroSrc={frontHeroSrc}
                backDisplaySrc={backDisplaySrc && !backImageFailed ? backDisplaySrc : null}
                backImageFailed={backImageFailed}
                onBackImageError={() => setBackImageFailed(true)}
                grading={gradingPayload}
                gradingLoading={gradingBusy}
                onRunAnalysis={runGradingAnalysis}
                readOnly={readOnly}
              />
            </Suspense>
            <GradingNextSteps
              binderId={detail.binder_id}
              cardId={detail.id}
              readOnly={readOnly}
              hasGrading={Boolean(
                gradingPayload &&
                  (gradingPayload.summary.analyzedAt != null ||
                    gradingPayload.summary.overall != null)
              )}
            />
          </div>

          <div className="space-y-mca-md">
            <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
              <h3 className="text-mca-h3 text-mca-ink-strong">{detail.name}</h3>
              <div className="mt-mca-md grid gap-mca-md sm:grid-cols-2">
                <Field id="card-rarity" label="Rarity">
                  <p id="card-rarity" className="flex items-center gap-mca-sm text-mca-body text-mca-ink-body">
                    <Icon
                      src={rarityIconSrc(detail.rarity)}
                      size="sm"
                      alt=""
                      className="opacity-80"
                    />
                    {detail.rarity ?? "Unknown rarity"}
                  </p>
                </Field>
                <Field id="card-number" label="Number">
                  <p id="card-number" className="text-mca-body text-mca-ink-body">
                    #{detail.number ?? "?"}
                  </p>
                </Field>
              </div>
              <p className="mt-mca-md flex items-center gap-mca-sm text-mca-body text-mca-ink-soft">
                <Icon src={McaIcons.system.info} size="sm" alt="" className="opacity-90" />
                <span>
                  Market price:{" "}
                  <span className="font-semibold">
                    ${Number(detail.price?.market_price ?? 0).toFixed(2)}
                  </span>
                </span>
              </p>
            </Panel>

            <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
              <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                Set
              </p>
              <p className="mt-mca-sm flex flex-wrap items-center gap-x-mca-sm gap-y-mca-xs text-mca-body text-mca-ink-body">
                <Icon src={McaIcons.system.info} size="sm" alt="" className="opacity-80" />
                {detail.set_name ?? "Unknown set"}
              </p>
              {detail.catalog ? (
                <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">
                  Catalog: {detail.catalog.name}
                  {detail.catalog.supertype ? ` · ${detail.catalog.supertype}` : ""}
                </p>
              ) : (
                <p className="mt-mca-sm text-mca-caption text-mca-hint">
                  Not linked to the Pokémon catalog yet.
                </p>
              )}
            </Panel>

            {!readOnly && detail ? (
              <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
                <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                  Marketplace
                </p>
                <p className="mt-mca-xs text-mca-caption text-mca-hint">
                  Non-transactional signals for discovery. Requires a catalog-linked card. Browse aggregate demand
                  and supply under{" "}
                  <Link
                    href="/market"
                    className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:text-mca-accent"
                    onClick={onClose}
                  >
                    Marketplace
                  </Link>
                  .
                </p>
                <div className="mt-mca-md flex flex-col gap-mca-sm">
                  <label className="flex cursor-pointer items-start gap-mca-sm text-mca-body text-mca-ink-body">
                    <input
                      type="checkbox"
                      className="mt-mca-xs h-4 w-4 shrink-0 rounded border-mca-border text-mca-accent-strong focus:ring-mca-focus/60"
                      checked={detail.for_trade ?? false}
                      disabled={pendingKey === "market" || !detail.catalog_card_id}
                      onChange={(e) => {
                        void (async () => {
                          if (!cardId) return;
                          setPendingKey("market");
                          setError(null);
                          try {
                            const r = await fetchJson<CardPatchResponseDTO>(
                              `/api/cards/${encodeURIComponent(cardId)}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ for_trade: e.target.checked }),
                              }
                            );
                            if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
                            await load();
                            if (onChanged) await onChanged();
                          } catch (err) {
                            if (isLikelyOfflineError(err) && cardId) {
                              enqueueOfflineAction({
                                kind: "card_market_flags",
                                cardId,
                                patch: { for_trade: e.target.checked },
                              });
                              setError(
                                "Offline — For trade change queued; it will sync when you are back online."
                              );
                              mcaLog.event(
                                "mobile.offline.queue",
                                { kind: "card_market_flags", field: "for_trade" },
                                telemetryCtx
                              );
                            } else {
                              setError(err instanceof Error ? err.message : "Could not update");
                            }
                          } finally {
                            setPendingKey(null);
                          }
                        })();
                      }}
                    />
                    <span>
                      <span className="font-medium text-mca-ink-strong">For trade</span>
                      <span className="block text-mca-caption text-mca-ink-muted">
                        Others can see aggregate supply for this catalog card.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-mca-sm text-mca-body text-mca-ink-body">
                    <input
                      type="checkbox"
                      className="mt-mca-xs h-4 w-4 shrink-0 rounded border-mca-border text-mca-accent-strong focus:ring-mca-focus/60"
                      checked={detail.looking_for ?? false}
                      disabled={pendingKey === "market" || !detail.catalog_card_id}
                      onChange={(e) => {
                        void (async () => {
                          if (!cardId) return;
                          setPendingKey("market");
                          setError(null);
                          try {
                            const r = await fetchJson<CardPatchResponseDTO>(
                              `/api/cards/${encodeURIComponent(cardId)}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ looking_for: e.target.checked }),
                              }
                            );
                            if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
                            await load();
                            if (onChanged) await onChanged();
                          } catch (err) {
                            if (isLikelyOfflineError(err) && cardId) {
                              enqueueOfflineAction({
                                kind: "card_market_flags",
                                cardId,
                                patch: { looking_for: e.target.checked },
                              });
                              setError(
                                "Offline — Looking for change queued; it will sync when you are back online."
                              );
                              mcaLog.event(
                                "mobile.offline.queue",
                                { kind: "card_market_flags", field: "looking_for" },
                                telemetryCtx
                              );
                            } else {
                              setError(err instanceof Error ? err.message : "Could not update");
                            }
                          } finally {
                            setPendingKey(null);
                          }
                        })();
                      }}
                    />
                    <span>
                      <span className="font-medium text-mca-ink-strong">Looking for</span>
                      <span className="block text-mca-caption text-mca-ink-muted">
                        Signals that you want this catalog card in trades.
                      </span>
                    </span>
                  </label>
                </div>
                {!detail.catalog_card_id ? (
                  <p className="mt-mca-sm text-mca-caption text-mca-hint">
                    Link this card to the catalog to enable marketplace flags.
                  </p>
                ) : null}
              </Panel>
            ) : null}

            <Suspense
              fallback={
                <div className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/50 p-mca-base text-xs text-mca-ink-subtle dark:border-mca-border-subtle">
                  Loading price history…
                </div>
              }
            >
              <CardDetailPriceSectionLazy
                priceHistory={priceHistory}
                priceHistoryLoading={priceHistoryLoading}
                priceHistoryError={priceHistoryError}
              />
            </Suspense>

            <CardDetailLegalitySection catalog={catalogForLegality} />

            {readOnly ? (
              <Panel className="border-mca-border bg-mca-surface-elevated/50 p-mca-md dark:border-mca-border-subtle">
                <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                  Binder
                </p>
                <p className="mt-mca-sm text-mca-body text-mca-ink-body">
                  <span className="font-medium text-mca-ink-strong">
                    {detail.binder_name ?? detail.binder_id}
                  </span>
                </p>
                <Link
                  href={`/binders/${encodeURIComponent(detail.binder_id)}`}
                  className="mt-mca-md inline-flex"
                  onClick={onClose}
                >
                  <Button type="button" variant="secondary" className="px-mca-md py-mca-sm text-mca-caption">
                    <Icon src={McaIcons.collection.binder} size="sm" alt="" />
                    View binder
                  </Button>
                </Link>
                <p className="mt-mca-md text-mca-caption text-mca-hint">
                  Moving cards or uploading images is only available inside a binder.
                </p>
              </Panel>
            ) : (
              <Panel className="border-mca-border bg-mca-surface-elevated/50 p-mca-md dark:border-mca-border-subtle">
                <div className="flex items-center justify-between gap-mca-md">
                  <p className="text-mca-body text-mca-ink-body">
                    Binder:{" "}
                    <span className="font-medium text-mca-ink-strong">
                      {detail.binder_name ?? detail.binder_id}
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pendingKey !== null}
                    className="px-mca-md py-mca-sm text-mca-caption"
                    onClick={() => setShowBinderPicker((v) => !v)}
                  >
                    <Icon src={McaIcons.collection.binder} size="sm" alt="" />
                    Move to Binder...
                  </Button>
                </div>
                {showBinderPicker ? (
                  <div className="mt-mca-base flex items-center gap-mca-compact">
                    <select
                      value={selectedBinder}
                      disabled={pendingKey !== null}
                      onChange={(e) => setSelectedBinder(e.target.value)}
                      className="mca-input flex-1 rounded-mca-control px-mca-compact py-mca-sm text-sm disabled:opacity-50"
                    >
                      {binders.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <LoadingButton
                      type="button"
                      isLoading={pendingKey === "binder"}
                      disabled={!selectedBinder || (pendingKey !== null && pendingKey !== "binder")}
                      className="rounded-mca-control bg-mca-accent-strong px-mca-compact py-mca-sm text-xs font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
                      onClick={async () => {
                        if (!cardId || !selectedBinder) return;
                        setError(null);
                        setPendingKey("binder");
                        try {
                          const r = await fetchJson<CardPatchResponseDTO>(
                            `/api/cards/${encodeURIComponent(cardId)}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ binder_id: selectedBinder }),
                            }
                          );
                          if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
                          await load();
                          await loadPriceHistory(cardId);
                          if (onChanged) await onChanged();
                          setShowBinderPicker(false);
                          setActionSuccess("Card moved to binder.");
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to move card");
                        } finally {
                          setPendingKey(null);
                        }
                      }}
                    >
                      Save
                    </LoadingButton>
                  </div>
                ) : null}
              </Panel>
            )}

            {readOnly ? (
              <Panel className="border-mca-border bg-mca-surface-elevated/50 p-mca-md dark:border-mca-border-subtle">
                <p className="text-mca-h3 text-mca-ink-strong">Deck locations</p>
                <div className="mt-mca-md space-y-mca-sm">
                  {detail.deck_locations.length > 0 ? (
                    detail.deck_locations.map((loc) => {
                      const key = `ro-${loc.deck_id}-${loc.zone}`;
                      return (
                        <div
                          key={key}
                          className="rounded-mca-block border border-mca-border px-mca-md py-mca-sm dark:border-mca-border-subtle"
                        >
                          <p className="text-mca-caption text-mca-ink-body">
                            <span className="font-medium text-mca-ink-strong">{loc.deck_name}</span>
                            {" · "}
                            {loc.zone}
                            {" · qty "}
                            {loc.quantity}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-mca-caption text-mca-ink-subtle">Not in any decks.</p>
                  )}
                </div>
                <p className="mt-mca-md text-mca-caption text-mca-hint">
                  Edit decks from the deck builder or a binder — not from this read-only view.
                </p>
              </Panel>
            ) : (
              <Panel className="border-mca-border bg-mca-surface-elevated/50 p-mca-md dark:border-mca-border-subtle">
                <div className="flex items-center justify-between gap-mca-md">
                  <p className="text-mca-h3 text-mca-ink-strong">Deck locations</p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pendingKey !== null}
                    className="px-mca-md py-mca-sm text-mca-caption"
                    onClick={() => setShowDeckPicker((v) => !v)}
                  >
                    <Icon src={McaIcons.collection.deck} size="sm" alt="" />
                    Add to Deck...
                  </Button>
                </div>

                {showDeckPicker ? (
                  <div className="mt-mca-base grid grid-cols-1 gap-mca-compact sm:grid-cols-[1fr_140px_auto]">
                    <select
                      value={selectedDeck}
                      disabled={pendingKey !== null}
                      onChange={(e) => setSelectedDeck(e.target.value)}
                      className="mca-input rounded-mca-control px-mca-compact py-mca-sm text-sm disabled:opacity-50"
                    >
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedZone}
                      disabled={pendingKey !== null}
                      onChange={(e) =>
                        setSelectedZone(e.target.value as "main" | "sideboard" | "commander")
                      }
                      className="mca-input rounded-mca-control px-mca-compact py-mca-sm text-sm disabled:opacity-50"
                    >
                      <option value="main">Main deck</option>
                      <option value="sideboard">Side deck</option>
                      <option value="commander">Brawl</option>
                    </select>
                    <LoadingButton
                      type="button"
                      isLoading={pendingKey === "deck-add"}
                      disabled={!selectedDeck || (pendingKey !== null && pendingKey !== "deck-add")}
                      className="rounded-mca-control bg-mca-accent-strong px-mca-compact py-mca-sm text-xs font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
                      onClick={async () => {
                        if (!cardId || !selectedDeck) return;
                        setError(null);
                        setPendingKey("deck-add");
                        try {
                          const r = await fetchJson<DeckCardSlotMutationAckDTO>(
                            `/api/decks/${encodeURIComponent(selectedDeck)}/cards/add`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ card_id: cardId, zone: selectedZone }),
                            }
                          );
                          if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
                          await load();
                          await loadPriceHistory(cardId);
                          if (onChanged) await onChanged();
                          setShowDeckPicker(false);
                          setActionSuccess("Card added to deck.");
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to add to deck");
                        } finally {
                          setPendingKey(null);
                        }
                      }}
                    >
                      Add
                    </LoadingButton>
                  </div>
                ) : null}

                <div className="mt-mca-base space-y-mca-sm">
                  {detail.deck_locations.length > 0 ? (
                    detail.deck_locations.map((loc) => {
                      const actionKey = `rm-${loc.deck_id}-${loc.zone}`;
                      return (
                        <DeckLocationRow
                          key={actionKey}
                          actionKey={actionKey}
                          deckName={loc.deck_name}
                          zone={loc.zone}
                          qty={loc.quantity}
                          pendingKey={pendingKey}
                          onRemove={async () => {
                            if (!cardId) return;
                            setError(null);
                            setPendingKey(actionKey);
                            try {
                              const r = await fetchJson<DeckCardSlotMutationAckDTO>(
                                `/api/decks/${encodeURIComponent(loc.deck_id)}/cards/remove`,
                                {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ card_id: cardId, zone: loc.zone }),
                                }
                              );
                              if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
                              await load();
                              await loadPriceHistory(cardId);
                              if (onChanged) await onChanged();
                              setActionSuccess("Removed from deck.");
                            } catch (e) {
                              setError(
                                e instanceof Error ? e.message : "Failed to remove from deck"
                              );
                            } finally {
                              setPendingKey(null);
                            }
                          }}
                        />
                      );
                    })
                  ) : (
                    <p className="text-mca-caption text-mca-ink-subtle">Not in any decks.</p>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
      </section>
    </ModalBase>
  );
}
