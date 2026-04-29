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
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";

const CardGradingSectionLazy = lazy(async () => ({
  default: (await import("@/components/grading/card-grading-section")).CardGradingSection,
}));

function resolveFrontHeroSrc(d: CardDetail): string | null {
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

type Binder = { id: string; name: string };
type Deck = { id: string; name: string };

type CardDetail = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  set_name: string | null;
  image_url: string | null;
  image_front_thumb_url?: string | null;
  image_front_full_url?: string | null;
  image_back_full_url?: string | null;
  image_back_thumb_url?: string | null;
  binder_id: string;
  binder_name: string | null;
  catalog_card_id: string | null;
  for_trade: boolean;
  looking_for: boolean;
  catalog: {
    id: string;
    name: string;
    supertype: string | null;
    subtypes: string[];
    legal_standard: boolean;
    legal_expanded: boolean;
    legal_unlimited: boolean;
    legal_commander: boolean;
  } | null;
  deck_locations: { deck_id: string; deck_name: string; zone: string; quantity: number }[];
  price: {
    market_price: number | null;
    currency: string;
    provider: string;
    updated_at: string;
  } | null;
};

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
  const [loading, setLoading] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [binders, setBinders] = useState<Binder[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showBinderPicker, setShowBinderPicker] = useState(false);
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [selectedBinder, setSelectedBinder] = useState("");
  const [selectedDeck, setSelectedDeck] = useState("");
  const [selectedZone, setSelectedZone] = useState<"main" | "sideboard" | "commander">("main");
  const [priceHistory, setPriceHistory] = useState<PriceHistRow[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [priceHistoryError, setPriceHistoryError] = useState<string | null>(null);
  const [backImageFailed, setBackImageFailed] = useState(false);
  const [gradingPayload, setGradingPayload] = useState<GradingPayload | null>(null);
  const [gradingBusy, setGradingBusy] = useState(false);

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
      const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}/grade`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        grade?: GradingPayload;
        error?: string;
      };
      if (res.ok && body.grade) {
        setGradingPayload(body.grade);
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
      const body = (await res.json().catch(() => ({}))) as { grade?: GradingPayload };
      if (res.ok && body.grade) {
        setGradingPayload(body.grade);
        mcaLog.event("card.grade.analysis_complete", { cardId }, telemetryCtx);
      }
    } finally {
      setGradingBusy(false);
    }
  }, [cardId, readOnly, telemetryCtx]);

  const load = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    try {
      const detailRes = await fetch(`/api/cards/${encodeURIComponent(cardId)}/detail`, {
        cache: "no-store",
      });
      const detailBody = (await detailRes.json().catch(() => ({}))) as {
        card?: CardDetail;
        error?: string;
      };

      if (!detailRes.ok) {
        throw new Error(detailBody.error ?? "Failed to load card detail");
      }

      setDetail(detailBody.card ?? null);

      if (readOnly) {
        setBinders([]);
        setDecks([]);
        setShowBinderPicker(false);
        setShowDeckPicker(false);
      } else {
        const [bindersRes, decksRes] = await Promise.all([
          fetch("/api/binders", { cache: "no-store" }),
          fetch("/api/decks/list", { cache: "no-store" }),
        ]);
        const bindersBody = bindersRes.ok
          ? ((await bindersRes.json()) as { binders?: Binder[] })
          : { binders: [] };
        const decksBody = decksRes.ok ? ((await decksRes.json()) as { decks?: Deck[] }) : { decks: [] };
        const nextBinders = Array.isArray(bindersBody.binders) ? bindersBody.binders : [];
        const nextDecks = Array.isArray(decksBody.decks) ? decksBody.decks : [];
        setBinders(nextBinders);
        setDecks(nextDecks);
        setSelectedBinder(nextBinders[0]?.id ?? "");
        setSelectedDeck(nextDecks[0]?.id ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load card detail");
    } finally {
      setLoading(false);
    }
  }, [cardId, readOnly]);

  const loadPriceHistory = useCallback(async (id: string) => {
    setPriceHistoryLoading(true);
    setPriceHistoryError(null);
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(id)}/price-history?limit=120`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        history?: PriceHistRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load price history");
      setPriceHistory(Array.isArray(body.history) ? body.history : []);
    } catch (e) {
      setPriceHistory([]);
      setPriceHistoryError(e instanceof Error ? e.message : "Price history unavailable");
    } finally {
      setPriceHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !cardId) return;
    void load();
    void loadPriceHistory(cardId);
    void loadGrading();
  }, [open, cardId, load, loadGrading, loadPriceHistory]);

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
      {loading ? (
        <p className="p-mca-lg text-sm text-mca-ink-muted">Loading card details...</p>
      ) : error ? (
        <div className="p-mca-lg">
          <InlineError showIcon>{error}</InlineError>
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
                            const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ for_trade: e.target.checked }),
                            });
                            const body = (await res.json().catch(() => ({}))) as { error?: string };
                            if (!res.ok) throw new Error(body.error ?? "Could not update");
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
                            const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ looking_for: e.target.checked }),
                            });
                            const body = (await res.json().catch(() => ({}))) as { error?: string };
                            if (!res.ok) throw new Error(body.error ?? "Could not update");
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
                      className="flex-1 rounded-mca-control border border-mca-border bg-mca-surface-elevated/95 px-mca-compact py-mca-sm text-sm text-mca-ink-strong transition-all duration-200 ease-mca-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50 dark:border-mca-border-subtle"
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
                          const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ binder_id: selectedBinder }),
                          });
                          const body = (await res.json().catch(() => ({}))) as { error?: string };
                          if (!res.ok) throw new Error(body.error ?? "Failed to move card");
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
                      className="rounded-mca-control border border-mca-border bg-mca-surface-elevated/95 px-mca-compact py-mca-sm text-sm text-mca-ink-strong transition-all duration-200 ease-mca-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50 dark:border-mca-border-subtle"
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
                      className="rounded-mca-control border border-mca-border bg-mca-surface-elevated/95 px-mca-compact py-mca-sm text-sm text-mca-ink-strong transition-all duration-200 ease-mca-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50 dark:border-mca-border-subtle"
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
                          const res = await fetch(
                            `/api/decks/${encodeURIComponent(selectedDeck)}/cards/add`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ card_id: cardId, zone: selectedZone }),
                            }
                          );
                          const body = (await res.json().catch(() => ({}))) as { error?: string };
                          if (!res.ok) throw new Error(body.error ?? "Failed to add card");
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
                              const res = await fetch(
                                `/api/decks/${encodeURIComponent(loc.deck_id)}/cards/remove`,
                                {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ card_id: cardId, zone: loc.zone }),
                                }
                              );
                              const body = (await res.json().catch(() => ({}))) as { error?: string };
                              if (!res.ok) throw new Error(body.error ?? "Failed to remove");
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
    </ModalBase>
  );
}
