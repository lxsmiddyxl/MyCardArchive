"use client";

import { CatalogOfferPreviews } from "@/components/market/catalog-offer-previews";
import { OfferExpiryCountdown } from "@/components/market/offer-expiry-countdown";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { isUuidString } from "@/lib/server/is-uuid";
import { useCallback, useEffect, useMemo, useState } from "react";

type OfferRow = {
  id: string;
  thread_id: string;
  parent_offer_id: string | null;
  from_user_id: string;
  to_user_id: string;
  catalog_card_id: string | null;
  body: string;
  status: string;
  created_at: string;
  updated_at?: string;
  items_offered?: unknown;
  items_requested?: unknown;
  offer_notes?: string | null;
  expires_at?: string | null;
};

function linesToStructuredItems(text: string): { catalog_card_id: string; qty: number }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((id) => isUuidString(id))
    .map((catalog_card_id) => ({ catalog_card_id, qty: 1 }));
}

type TimelineEvent = {
  id: string;
  thread_id: string;
  offer_id: string;
  event_type: string;
  actor_id: string;
  created_at: string;
};

type RevisionRow = {
  id: string;
  thread_id: string;
  seq: number;
  offer_id: string;
  snapshot: Record<string, unknown>;
  actor_id: string;
  created_at: string;
};

type ThreadPack = {
  thread_id: string;
  offers: OfferRow[];
  last_at: string;
};

export function MarketOffersPanel({ currentUserId }: { currentUserId: string }) {
  const [threads, setThreads] = useState<ThreadPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    offers: OfferRow[];
    events: TimelineEvent[];
    revisions: RevisionRow[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [toUserId, setToUserId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [offerBody, setOfferBody] = useState("");
  const [offeredLines, setOfferedLines] = useState("");
  const [requestedLines, setRequestedLines] = useState("");
  const [offerNotesExtra, setOfferNotesExtra] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);

  const [counterDraft, setCounterDraft] = useState<Record<string, string>>({});
  const [reviseDraft, setReviseDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market/offers", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        threads?: ThreadPack[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load offers");
      setThreads(Array.isArray(body.threads) ? body.threads : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadThread = useCallback(async (threadId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market/trade-rooms/${encodeURIComponent(threadId)}`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        offers?: OfferRow[];
        events?: TimelineEvent[];
        revisions?: RevisionRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load trade room");
      setDetail({
        offers: body.offers ?? [],
        events: body.events ?? [],
        revisions: body.revisions ?? [],
      });
      setOpenThreadId(threadId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load thread");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const sendOffer = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const items_offered = linesToStructuredItems(offeredLines);
      const items_requested = linesToStructuredItems(requestedLines);
      const res = await fetch("/api/market/offers", {
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
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not send offer");
      setToUserId("");
      setCatalogId("");
      setOfferBody("");
      setOfferedLines("");
      setRequestedLines("");
      setOfferNotesExtra("");
      setExpiresAt("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }, [toUserId, catalogId, offerBody, offeredLines, requestedLines, offerNotesExtra, expiresAt, load]);

  const counter = useCallback(
    async (offerId: string) => {
      const text = (counterDraft[offerId] ?? "").trim();
      if (!text) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/market/offers/${encodeURIComponent(offerId)}/counter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not counter");
        setCounterDraft((d) => ({ ...d, [offerId]: "" }));
        await load();
        if (openThreadId) await loadThread(openThreadId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not counter");
      } finally {
        setBusy(false);
      }
    },
    [counterDraft, load, loadThread, openThreadId]
  );

  const decline = useCallback(
    async (offerId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/market/offers/${encodeURIComponent(offerId)}/decline`, {
          method: "POST",
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not decline");
        await load();
        if (openThreadId) await loadThread(openThreadId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not decline");
      } finally {
        setBusy(false);
      }
    },
    [load, loadThread, openThreadId]
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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/market/offers/${encodeURIComponent(pendingFromYou.id)}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not revise");
      await load();
      if (openThreadId) await loadThread(openThreadId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revise");
    } finally {
      setBusy(false);
    }
  }, [pendingFromYou, reviseDraft, load, loadThread, openThreadId]);

  if (loading) {
    return (
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-caption text-mca-ink-muted">Loading offers…</p>
      </Panel>
    );
  }

  return (
    <div className="touch-manipulation space-y-mca-lg">
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
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm font-mono text-sm text-mca-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
            />
          </Field>
          <Field id="offer-catalog" label="Catalog card id (optional)" className="min-w-0">
            <input
              id="offer-catalog"
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              placeholder="Optional catalog card UUID"
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm font-mono text-sm text-mca-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
            />
          </Field>
        </div>
        <Field id="offer-body" label="Offer message" className="mt-mca-sm">
          <textarea
            id="offer-body"
            value={offerBody}
            onChange={(e) => setOfferBody(e.target.value)}
            rows={3}
            className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm text-sm text-mca-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
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
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm font-mono text-mca-caption outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
            />
          </Field>
          <Field id="offer-items-want" label="Items requested (catalog UUIDs, one per line)" className="min-w-0">
            <textarea
              id="offer-items-want"
              value={requestedLines}
              onChange={(e) => setRequestedLines(e.target.value)}
              rows={3}
              placeholder="Optional structured lines"
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm font-mono text-mca-caption outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
            />
          </Field>
        </div>
        <div className="mt-mca-md grid gap-mca-sm md:grid-cols-2">
          <Field id="offer-notes-extra" label="Notes" className="min-w-0">
            <input
              id="offer-notes-extra"
              value={offerNotesExtra}
              onChange={(e) => setOfferNotesExtra(e.target.value)}
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
            />
          </Field>
          <Field id="offer-expires" label="Expires (optional)" className="min-w-0">
            <input
              id="offer-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
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
                            {String((r.snapshot as { body?: unknown }).body ?? "")}
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
                    <li
                      key={o.id}
                      className="rounded-mca-control border border-mca-border/70 bg-mca-surface/40 px-mca-sm py-mca-xs"
                    >
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
                        className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
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
                        className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
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
    </div>
  );
}
