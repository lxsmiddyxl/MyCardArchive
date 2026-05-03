"use client";

import {
  fetchJson,
  fetchJsonErrorMessage,
  scheduleCoalescedRouterRefresh,
  useAsyncState,
} from "@/lib/client";
import type {
  MarketOfferMutationResponseDTO,
  MarketOfferRowDTO,
  MarketOfferRevisionRowDTO,
  MarketOfferRevisionSnapshotDTO,
  MarketOfferThreadPackDTO,
  MarketOfferTimelineEventDTO,
  MarketOffersListPayloadDTO,
  MarketTradeRoomPayloadDTO,
} from "@/lib/dto/market-offers";
import { CatalogOfferPreviews } from "@/components/market/catalog-offer-previews";
import { OfferExpiryCountdown } from "@/components/market/offer-expiry-countdown";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { requestMarketSurfacesRefresh } from "@/lib/market/market-surfaces-refresh";
import { isUuidString } from "@/lib/server/is-uuid";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

type OfferRow = MarketOfferRowDTO;

function linesToStructuredItems(text: string): { catalog_card_id: string; qty: number }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((id) => isUuidString(id))
    .map((catalog_card_id) => ({ catalog_card_id, qty: 1 }));
}

type TimelineEvent = MarketOfferTimelineEventDTO;
type RevisionRow = MarketOfferRevisionRowDTO;
type ThreadPack = MarketOfferThreadPackDTO;

type ThreadDetailState = {
  offers: OfferRow[];
  events: TimelineEvent[];
  revisions: RevisionRow[];
} | null;

const OfferDetailCard = memo(function OfferDetailCard({
  o,
  currentUserId,
}: {
  o: OfferRow;
  currentUserId: string;
}) {
  return (
    <li className="rounded-mca-control border border-mca-border/70 bg-mca-surface/40 px-mca-sm py-mca-xs">
      <p className="text-mca-caption text-mca-ink-muted">
        {o.from_user_id === currentUserId ? "You" : "Them"} →{" "}
        {o.to_user_id === currentUserId ? "you" : "them"} ·{" "}
        <span className="font-medium text-mca-ink-strong">{o.status}</span>
      </p>
      <p className="mt-mca-trace whitespace-pre-wrap text-mca-body text-mca-ink-body">{o.body}</p>
      {Array.isArray(o.items_offered) && o.items_offered.length > 0 ? (
        <p className="mt-mca-trace font-mono text-mca-caption text-mca-ink-muted">
          Offered: {JSON.stringify(o.items_offered)}
        </p>
      ) : null}
      {Array.isArray(o.items_requested) && o.items_requested.length > 0 ? (
        <p className="mt-mca-trace font-mono text-mca-caption text-mca-ink-muted">
          Requested: {JSON.stringify(o.items_requested)}
        </p>
      ) : null}
      {o.offer_notes ? (
        <p className="mt-mca-trace text-mca-caption text-mca-ink-muted">Notes: {o.offer_notes}</p>
      ) : null}
      {o.expires_at ? (
        <div className="mt-mca-trace">
          <OfferExpiryCountdown expiresAt={o.expires_at} />
        </div>
      ) : null}
      <CatalogOfferPreviews itemsOffered={o.items_offered} itemsRequested={o.items_requested} />
    </li>
  );
});

export function MarketOffersPanel({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const { run: runList, data: listData, loading: listLoading, error: listError } =
    useAsyncState<ThreadPack[]>();
  const { run: runThread, data: threadData, loading: threadLoading, error: threadError } =
    useAsyncState<ThreadDetailState>();
  const { run: runAction, loading: actionLoading, error: actionError } = useAsyncState<unknown>();

  const threads = listData ?? [];
  const loading = listLoading || (listData === null && !listError);
  const error = listError ?? threadError ?? actionError;
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const detail = threadData ?? null;
  const detailLoading = threadLoading;
  const busy = actionLoading;

  const [toUserId, setToUserId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [offerBody, setOfferBody] = useState("");
  const [offeredLines, setOfferedLines] = useState("");
  const [requestedLines, setRequestedLines] = useState("");
  const [offerNotesExtra, setOfferNotesExtra] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [counterDraft, setCounterDraft] = useState<Record<string, string>>({});
  const [reviseDraft, setReviseDraft] = useState("");

  const load = useCallback(async () => {
    await runList(async () => {
      const r = await fetchJson<MarketOffersListPayloadDTO>("/api/market/offers", { cache: "no-store" });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      return Array.isArray(r.data.threads) ? r.data.threads : [];
    });
  }, [runList]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadThread = useCallback(
    async (threadId: string) => {
      await runThread(async () => {
        const r = await fetchJson<MarketTradeRoomPayloadDTO>(
          `/api/market/trade-rooms/${encodeURIComponent(threadId)}`,
          {
            cache: "no-store",
          }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        const body = r.data;
        setOpenThreadId(threadId);
        return {
          offers: body.offers ?? [],
          events: body.events ?? [],
          revisions: body.revisions ?? [],
        };
      });
    },
    [runThread]
  );

  const sendOffer = useCallback(async () => {
    await runAction(async () => {
      const items_offered = linesToStructuredItems(offeredLines);
      const items_requested = linesToStructuredItems(requestedLines);
      const r = await fetchJson<MarketOfferMutationResponseDTO>("/api/market/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: toUserId.trim(),
          catalog_card_id: catalogId.trim() || null,
          body: offerBody.trim(),
          items_offered,
          items_requested,
          offer_notes: offerNotesExtra.trim() || null,
          expires_at: expiresAt.trim() || null,
        }),
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      setToUserId("");
      setCatalogId("");
      setOfferBody("");
      setOfferedLines("");
      setRequestedLines("");
      setOfferNotesExtra("");
      setExpiresAt("");
      await load();
      requestMarketSurfacesRefresh();
      scheduleCoalescedRouterRefresh(router);
    });
  }, [
    runAction,
    toUserId,
    catalogId,
    offerBody,
    offeredLines,
    requestedLines,
    offerNotesExtra,
    expiresAt,
    load,
    router,
  ]);

  const counter = useCallback(
    async (offerId: string) => {
      const text = (counterDraft[offerId] ?? "").trim();
      if (!text) return;
      await runAction(async () => {
        const r = await fetchJson<MarketOfferMutationResponseDTO>(
          `/api/market/offers/${encodeURIComponent(offerId)}/counter`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
          }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        setCounterDraft((d) => ({ ...d, [offerId]: "" }));
        await load();
        if (openThreadId) await loadThread(openThreadId);
        requestMarketSurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      });
    },
    [counterDraft, load, loadThread, openThreadId, runAction, router]
  );

  const decline = useCallback(
    async (offerId: string) => {
      await runAction(async () => {
        const r = await fetchJson<MarketOfferMutationResponseDTO>(
          `/api/market/offers/${encodeURIComponent(offerId)}/decline`,
          { method: "POST" }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await load();
        if (openThreadId) await loadThread(openThreadId);
        requestMarketSurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      });
    },
    [load, loadThread, openThreadId, runAction, router]
  );

  const pendingForYou = useMemo(() => {
    if (!detail?.offers) return null;
    return [...detail.offers].reverse().find((o) => o.status === "pending" && o.to_user_id === currentUserId);
  }, [detail, currentUserId]);

  const pendingFromYou = useMemo(() => {
    if (!detail?.offers) return null;
    return [...detail.offers].reverse().find((o) => o.status === "pending" && o.from_user_id === currentUserId);
  }, [detail, currentUserId]);

  const activeExpiryOffer = useMemo(() => {
    if (!detail?.offers) return null;
    return [...detail.offers].reverse().find((o) => o.status === "pending" && o.expires_at);
  }, [detail]);

  useEffect(() => {
    if (pendingFromYou) {
      setReviseDraft(pendingFromYou.body);
    } else {
      setReviseDraft("");
    }
  }, [pendingFromYou]);

  const revise = useCallback(async () => {
    if (!pendingFromYou) return;
    const text = reviseDraft.trim();
    if (!text) return;
    await runAction(async () => {
      const r = await fetchJson<MarketOfferMutationResponseDTO>(
        `/api/market/offers/${encodeURIComponent(pendingFromYou.id)}/revise`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        }
      );
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      await load();
      if (openThreadId) await loadThread(openThreadId);
      requestMarketSurfacesRefresh();
      scheduleCoalescedRouterRefresh(router);
    });
  }, [pendingFromYou, reviseDraft, load, loadThread, openThreadId, runAction, router]);

  if (loading) {
    return (
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <section aria-live="polite" aria-busy>
          <p className="text-mca-caption text-mca-ink-muted">Loading offers…</p>
        </section>
      </Panel>
    );
  }

  return (
    <section
      className="touch-manipulation space-y-mca-lg"
      aria-live="polite"
      aria-busy={busy || detailLoading}
    >
      <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Send an offer
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Non-binding messages to another trainer (by user id). Add structured catalog lines (Phase 71) or a
          plain message — they can counter or decline.
        </p>
        <div className="mt-mca-md grid gap-mca-sm md:grid-cols-2">
          <Field id="offer-to-user" label="To user id" className="min-w-0">
            <input
              id="offer-to-user"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              placeholder="Trainer profile UUID"
              className="mca-input mt-mca-sm rounded-mca-control font-mono text-sm"
            />
          </Field>
          <Field id="offer-catalog" label="Catalog card id (optional)" className="min-w-0">
            <input
              id="offer-catalog"
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              placeholder="Optional catalog card UUID"
              className="mca-input mt-mca-sm rounded-mca-control font-mono text-sm"
            />
          </Field>
        </div>
        <Field id="offer-body" label="Offer message" className="mt-mca-sm">
          <textarea
            id="offer-body"
            value={offerBody}
            onChange={(e) => setOfferBody(e.target.value)}
            rows={3}
            className="mca-input mt-mca-sm rounded-mca-control text-sm min-h-[4rem]"
          />
        </Field>
        <div className="mt-mca-md grid gap-mca-sm md:grid-cols-2">
          <Field id="offer-items-offer" label="Items offered (catalog UUIDs, one per line)" className="min-w-0">
            <textarea
              id="offer-items-offer"
              value={offeredLines}
              onChange={(e) => setOfferedLines(e.target.value)}
              rows={3}
              placeholder="Optional structured lines"
              className="mca-input mt-mca-sm rounded-mca-control font-mono text-mca-caption min-h-[4rem]"
            />
          </Field>
          <Field id="offer-items-want" label="Items requested (catalog UUIDs, one per line)" className="min-w-0">
            <textarea
              id="offer-items-want"
              value={requestedLines}
              onChange={(e) => setRequestedLines(e.target.value)}
              rows={3}
              placeholder="Optional structured lines"
              className="mca-input mt-mca-sm rounded-mca-control font-mono text-mca-caption min-h-[4rem]"
            />
          </Field>
        </div>
        <div className="mt-mca-md grid gap-mca-sm md:grid-cols-2">
          <Field id="offer-notes-extra" label="Notes" className="min-w-0">
            <input
              id="offer-notes-extra"
              value={offerNotesExtra}
              onChange={(e) => setOfferNotesExtra(e.target.value)}
              className="mca-input mt-mca-sm rounded-mca-control text-sm"
            />
          </Field>
          <Field id="offer-expires" label="Expires (optional)" className="min-w-0">
            <input
              id="offer-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mca-input mt-mca-sm rounded-mca-control text-sm"
            />
          </Field>
        </div>
        <div className="mt-mca-md flex justify-end">
          <Button
            type="button"
            disabled={
              busy ||
              !toUserId.trim() ||
              (!offerBody.trim() &&
                !linesToStructuredItems(offeredLines).length &&
                !linesToStructuredItems(requestedLines).length)
            }
            onClick={() => void sendOffer()}
          >
            Send offer
          </Button>
        </div>
      </Panel>

      {error ? (
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error}
        </p>
      ) : null}

      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Your threads
        </p>
        {threads.length === 0 ? (
          <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No offer threads yet.</p>
        ) : (
          <ul className="mt-mca-md space-y-mca-sm">
            {threads.map((t) => {
              const last = t.offers[t.offers.length - 1];
              return (
                <li key={t.thread_id}>
                  <button
                    type="button"
                    onClick={() => void loadThread(t.thread_id)}
                    className="w-full rounded-mca-control border border-mca-border/80 bg-mca-surface/50 px-mca-sm py-mca-xs text-left transition-colors duration-200 ease-mca-standard hover:bg-mca-chrome/40"
                  >
                    <span className="font-mono text-mca-caption text-mca-ink-body">{t.thread_id}</span>
                    <span className="mt-mca-trace block text-mca-caption text-mca-ink-muted">
                      Last: {last?.status ?? "—"} · {last?.body?.slice(0, 80)}
                      {last && last.body.length > 80 ? "…" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {openThreadId ? (
        <Panel className="border-mca-border bg-mca-surface-elevated/50 p-mca-md">
          <div className="flex flex-wrap items-center justify-between gap-mca-sm">
            <div>
              <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                Trade room
              </p>
              <p className="mt-mca-trace font-mono text-mca-caption text-mca-ink-muted">{openThreadId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-mca-sm">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void loadThread(openThreadId)}>
                Refresh
              </Button>
              <Button type="button" variant="tertiary" onClick={() => setOpenThreadId(null)}>
                Close
              </Button>
            </div>
          </div>
          {detailLoading ? (
            <p className="mt-mca-md text-mca-caption text-mca-ink-muted">Loading…</p>
          ) : detail ? (
            <div className="mt-mca-md space-y-mca-lg">
              {activeExpiryOffer?.expires_at ? (
                <div className="rounded-mca-block border border-mca-border bg-mca-surface-muted px-mca-md py-mca-sm dark:border-mca-border-subtle">
                  <OfferExpiryCountdown expiresAt={activeExpiryOffer.expires_at} />
                </div>
              ) : null}

              <div>
                <p className="text-mca-caption font-medium text-mca-ink-muted">Offer revisions</p>
                {(detail.revisions ?? []).length === 0 ? (
                  <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">No revisions yet.</p>
                ) : (
                  <ol className="mt-mca-sm space-y-mca-sm">
                    {[...(detail.revisions ?? [])]
                      .slice()
                      .reverse()
                      .map((r) => (
                        <li
                          key={r.id}
                          className="rounded-mca-control border border-mca-border/70 bg-mca-surface/40 px-mca-sm py-mca-xs"
                        >
                          <p className="text-mca-caption text-mca-ink-muted">
                            #{r.seq} · offer {r.offer_id.slice(0, 8)}… ·{" "}
                            {r.actor_id === currentUserId ? "You" : "Them"} ·{" "}
                            <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString()}</time>
                          </p>
                          <p className="mt-mca-trace whitespace-pre-wrap text-mca-body text-mca-ink-body">
                            {String((r.snapshot as MarketOfferRevisionSnapshotDTO).body ?? "")}
                          </p>
                        </li>
                      ))}
                  </ol>
                )}
              </div>

              <div>
                <p className="text-mca-caption font-medium text-mca-ink-muted">Events</p>
                <ol className="mt-mca-sm space-y-mca-xs border-l border-mca-border/80 pl-mca-md">
                  {detail.events.map((ev) => (
                    <li key={ev.id} className="text-mca-caption text-mca-ink-body">
                      <span className="font-medium text-mca-ink-strong">{ev.event_type}</span> ·{" "}
                      <span className="font-mono text-mca-ink-muted">{ev.actor_id.slice(0, 8)}…</span> ·{" "}
                      <time dateTime={ev.created_at}>{new Date(ev.created_at).toLocaleString()}</time>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-mca-caption font-medium text-mca-ink-muted">Offers</p>
                <ul className="mt-mca-sm space-y-mca-sm">
                  {detail.offers.map((o) => (
                    <OfferDetailCard key={o.id} o={o} currentUserId={currentUserId} />
                  ))}
                </ul>
              </div>

              {pendingFromYou ? (
                <div className="rounded-mca-block border border-mca-border bg-mca-surface-muted p-mca-md dark:border-mca-border-subtle">
                  <p className="text-sm font-medium text-mca-ink-strong">Revise your pending offer</p>
                  <div className="mt-mca-md flex flex-col gap-mca-sm sm:flex-row sm:items-end">
                    <Field id={`revise-${pendingFromYou.id}`} label="Updated message" className="min-w-0 flex-1">
                      <textarea
                        id={`revise-${pendingFromYou.id}`}
                        value={reviseDraft}
                        onChange={(e) => setReviseDraft(e.target.value)}
                        rows={3}
                        className="mca-input mt-mca-sm rounded-mca-control text-sm min-h-[4rem]"
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || !reviseDraft.trim()}
                      onClick={() => void revise()}
                    >
                      Send revision
                    </Button>
                  </div>
                </div>
              ) : null}

              {pendingForYou ? (
                <div className="rounded-mca-block border border-mca-accent-strong/30 bg-mca-accent-strong/10 p-mca-md">
                  <p className="text-sm font-medium text-mca-ink-strong">Your move — pending offer</p>
                  <div className="mt-mca-md flex flex-col gap-mca-sm sm:flex-row sm:items-end">
                    <Field
                      id={`counter-${pendingForYou.id}`}
                      label="Counter message"
                      className="min-w-0 flex-1"
                    >
                      <textarea
                        id={`counter-${pendingForYou.id}`}
                        value={counterDraft[pendingForYou.id] ?? ""}
                        onChange={(e) =>
                          setCounterDraft((d) => ({ ...d, [pendingForYou.id]: e.target.value }))
                        }
                        rows={2}
                        className="mca-input mt-mca-sm rounded-mca-control text-sm min-h-[3.5rem]"
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || !(counterDraft[pendingForYou.id] ?? "").trim()}
                      onClick={() => void counter(pendingForYou.id)}
                    >
                      Counter
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void decline(pendingForYou.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : null}
    </section>
  );
}
