"use client";

import type { InventoryCardItem } from "@/components/cards/inventory-types";
import { MatchSuggestionsInline } from "@/components/matching/match-suggestions-inline";
import { TradeCardRow } from "@/components/trading/trade-card-row";
import { TradeOfferPanel } from "@/components/trading/trade-offer-panel";
import { TradeSummaryPanel } from "@/components/trading/trade-summary-panel";
import { FtueOverlay } from "@/components/onboarding/ftue-overlay";
import {
  Breadcrumb,
  Button,
  Field,
  InlineError,
  LoadingSpinner,
  NavBackLink,
  Panel,
} from "@/mca-ui";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { postCreateTrade } from "@/lib/trading/client-api";
import { computeTradeSummary } from "@/lib/trading";
import type { TradeCardLine } from "@/lib/trading/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function toLine(c: InventoryCardItem, side: "a" | "b", idx: number): TradeCardLine {
  return {
    id: `draft_${side}_${idx}_${c.id}`,
    cardId: c.id,
    name: c.name,
    setName: c.set,
    rarity: c.rarity,
    imageUrl: c.image_front_thumb_url ?? c.image_url,
    binderId: c.binder_id,
    binderName: c.binder_name,
    quantity: 1,
  };
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim()
  );
}

export type TradeNewClientProps = {
  currentUserId: string;
  /** Prefill from `/trades/new?counterparty=` */
  initialCounterpartyId?: string | null;
};

export function TradeNewClient({
  currentUserId,
  initialCounterpartyId = null,
}: TradeNewClientProps) {
  const router = useRouter();
  const [counterpartyId, setCounterpartyId] = useState(
    () => initialCounterpartyId?.trim() ?? ""
  );
  const [ownCards, setOwnCards] = useState<InventoryCardItem[]>([]);
  const [peerCards, setPeerCards] = useState<InventoryCardItem[]>([]);
  const [loadingOwn, setLoadingOwn] = useState(true);
  const [loadingPeer, setLoadingPeer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerError, setPeerError] = useState<string | null>(null);
  const [yours, setYours] = useState<TradeCardLine[]>([]);
  const [theirs, setTheirs] = useState<TradeCardLine[]>([]);
  const [sendBusy, setSendBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOwn(true);
      setError(null);
      try {
        const res = await fetch("/api/cards/list", {
          cache: "no-store",
          credentials: "include",
        });
        const body = (await res.json().catch(() => ({}))) as {
          cards?: InventoryCardItem[];
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Failed to load cards");
        if (!cancelled) setOwnCards(Array.isArray(body.cards) ? body.cards : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load cards");
      } finally {
        if (!cancelled) setLoadingOwn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPeerCards = useCallback(
    async (explicitId?: string) => {
      const id = (explicitId ?? counterpartyId).trim();
      if (!isUuid(id)) {
        setPeerError("Enter a valid counterparty user id (UUID).");
        setPeerCards([]);
        return;
      }
      if (id === currentUserId) {
        setPeerError("Choose someone else’s user id for the counterparty.");
        setPeerCards([]);
        return;
      }
      setLoadingPeer(true);
      setPeerError(null);
      try {
        const res = await fetch(
          `/api/trades/counterparty-cards?counterpartyId=${encodeURIComponent(id)}`,
          { cache: "no-store", credentials: "include" }
        );
        const body = (await res.json().catch(() => ({}))) as {
          cards?: InventoryCardItem[];
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Could not load peer inventory");
        setPeerCards(Array.isArray(body.cards) ? body.cards : []);
      } catch (e) {
        setPeerCards([]);
        setPeerError(e instanceof Error ? e.message : "Could not load peer inventory");
      } finally {
        setLoadingPeer(false);
      }
    },
    [counterpartyId, currentUserId]
  );

  const loadPeerCardsRef = useRef(loadPeerCards);
  loadPeerCardsRef.current = loadPeerCards;

  useEffect(() => {
    const id = initialCounterpartyId?.trim();
    if (!id || !isUuid(id) || id === currentUserId) return;
    void loadPeerCardsRef.current(id);
  }, [initialCounterpartyId, currentUserId]);

  const availableOwn = useMemo(() => {
    const inOffer = new Set([...yours, ...theirs].map((l) => l.cardId));
    return ownCards.filter((c) => !inOffer.has(c.id));
  }, [ownCards, yours, theirs]);

  const availablePeer = useMemo(() => {
    const inOffer = new Set([...yours, ...theirs].map((l) => l.cardId));
    return peerCards.filter((c) => !inOffer.has(c.id));
  }, [peerCards, yours, theirs]);

  const addYours = useCallback((c: InventoryCardItem) => {
    setYours((prev) => [...prev, toLine(c, "a", prev.length)]);
  }, []);

  const addTheirs = useCallback((c: InventoryCardItem) => {
    setTheirs((prev) => [...prev, toLine(c, "b", prev.length)]);
  }, []);

  const removeYours = useCallback((id: string) => {
    setYours((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const removeTheirs = useCallback((id: string) => {
    setTheirs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const summaryYours = useMemo(() => computeTradeSummary(yours), [yours]);
  const summaryTheirs = useMemo(() => computeTradeSummary(theirs), [theirs]);
  const summaryCombined = useMemo(
    () => computeTradeSummary([...yours, ...theirs]),
    [yours, theirs]
  );

  const submitTrade = useCallback(
    async (sendNow: boolean) => {
      if (sendNow) {
        setSendBusy(true);
      } else {
        setDraftBusy(true);
      }
      setError(null);
      const cp = counterpartyId.trim();
      if (!isUuid(cp) || cp === currentUserId) {
        setError("Enter a valid counterparty user id.");
        if (sendNow) setSendBusy(false);
        else setDraftBusy(false);
        return;
      }
      try {
        const out = await postCreateTrade({
          counterpartyId: cp,
          sendNow,
          offerLines: yours.map((l) => ({
            cardId: l.cardId,
            quantity: l.quantity ?? 1,
          })),
          requestLines: theirs.map((l) => ({
            cardId: l.cardId,
            quantity: l.quantity ?? 1,
          })),
        });
        if (!out.ok) throw new Error(out.error);
        const tid = out.trade.id;
        mcaLog.event(
          sendNow ? "trade.create.sent" : "trade.create.draft",
          {
            tradeId: tid,
            offerCount: yours.length,
            requestCount: theirs.length,
          },
          { componentName: "TradeNewClient", surfaceName: "trade-new" }
        );
        router.push(`/trades/${encodeURIComponent(tid)}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : sendNow ? "Could not send trade" : "Could not save draft");
      } finally {
        setSendBusy(false);
        setDraftBusy(false);
      }
    },
    [counterpartyId, currentUserId, yours, theirs, router]
  );

  return (
    <div className="space-y-mca-lg">
      <div className="flex flex-col gap-mca-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <NavBackLink href="/trades">← Trades</NavBackLink>
          <Breadcrumb
            items={[{ label: "Trades", href: "/trades" }, { label: "New trade" }]}
            className="mt-mca-xs"
          />
          <h1 className="mt-mca-sm text-mca-display text-mca-ink-strong">New trade</h1>
          <p className="mt-mca-sm max-w-2xl text-mca-body text-mca-ink-muted">
            Enter your trade partner’s user id, load their collection, then build your offer and what
            you’re requesting from their binders.
          </p>
        </div>
      </div>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <Field
          id="counterparty-id"
          label="Counterparty user id"
          hint="Paste their Supabase profile id (same as auth user id)."
        >
          <input
            id="counterparty-id"
            value={counterpartyId}
            onChange={(e) => setCounterpartyId(e.target.value)}
            className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated font-mono text-sm text-mca-ink-strong"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
          />
        </Field>
        <div className="mt-mca-md flex flex-wrap gap-mca-sm">
          <Button type="button" variant="secondary" onClick={() => void loadPeerCards()}>
            {loadingPeer ? "Loading…" : "Load peer inventory"}
          </Button>
        </div>
        {peerError ? <p className="mt-mca-sm text-mca-body text-mca-error-text-muted">{peerError}</p> : null}
      </Panel>

      <MatchSuggestionsInline
        title="Suggested trades"
        description="Based on your want list and what others are offering. Pick a partner to fill the field above and load their inventory."
        limit={5}
        container="panel"
        pickLabel="Use for trade"
        onPickUserId={(userId) => {
          setCounterpartyId(userId);
          void loadPeerCards(userId);
        }}
      />

      <TradeSummaryPanel yours={summaryYours} theirs={summaryTheirs} combined={summaryCombined} />

      {error ? <InlineError>{error}</InlineError> : null}

      <div className="grid gap-mca-lg lg:grid-cols-2">
        <TradeOfferPanel title="Your offer" subtitle="Cards you send from your collection">
          {yours.length === 0 ? (
            <p className="text-mca-body text-mca-ink-subtle">No cards yet.</p>
          ) : (
            yours.map((line) => (
              <div key={line.id} className="flex items-start gap-mca-sm">
                <div className="min-w-0 flex-1">
                  <TradeCardRow line={line} />
                </div>
                <Button type="button" variant="tertiary" onClick={() => removeYours(line.id)}>
                  Remove
                </Button>
              </div>
            ))
          )}
        </TradeOfferPanel>

        <TradeOfferPanel
          title="You request"
          subtitle="Cards you want from their collection (load peer inventory first)"
        >
          {theirs.length === 0 ? (
            <p className="text-mca-body text-mca-ink-subtle">No cards yet.</p>
          ) : (
            theirs.map((line) => (
              <div key={line.id} className="flex items-start gap-mca-sm">
                <div className="min-w-0 flex-1">
                  <TradeCardRow line={line} />
                </div>
                <Button type="button" variant="tertiary" onClick={() => removeTheirs(line.id)}>
                  Remove
                </Button>
              </div>
            ))
          )}
        </TradeOfferPanel>
      </div>

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Add cards
        </p>
        {loadingOwn ? (
          <div className="mt-mca-md flex items-center gap-mca-sm text-mca-body text-mca-ink-muted">
            <LoadingSpinner className="size-5 text-mca-accent" />
            Loading your cards…
          </div>
        ) : (
          <div className="mt-mca-md grid gap-mca-md md:grid-cols-2">
            <Field id="pick-yours" label="Add to your offer" hint="From your binders.">
              <select
                id="pick-yours"
                className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  e.target.value = "";
                  const c = ownCards.find((x) => x.id === id);
                  if (c) addYours(c);
                }}
              >
                <option value="" disabled>
                  Add to your offer…
                </option>
                {availableOwn.map((c) => (
                  <option key={`y-${c.id}`} value={c.id}>
                    {c.name} · {c.binder_name ?? c.binder_id}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="pick-theirs"
              label="Add to your request"
              hint="Uses peer inventory after you load it."
            >
              <select
                id="pick-theirs"
                className="mca-input mt-0 w-full rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body"
                defaultValue=""
                disabled={peerCards.length === 0}
                onChange={(e) => {
                  const id = e.target.value;
                  e.target.value = "";
                  const c = peerCards.find((x) => x.id === id);
                  if (c) addTheirs(c);
                }}
              >
                <option value="" disabled>
                  {peerCards.length === 0 ? "Load peer inventory first…" : "Add to your request…"}
                </option>
                {availablePeer.map((c) => (
                  <option key={`t-${c.id}`} value={c.id}>
                    {c.name} · {c.binder_name ?? c.binder_id}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap gap-mca-md">
        <Button
          type="button"
          variant="secondary"
          disabled={
            draftBusy ||
            sendBusy ||
            (yours.length === 0 && theirs.length === 0)
          }
          onClick={() => void submitTrade(false)}
        >
          {draftBusy ? "Saving…" : "Save draft"}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={
            sendBusy ||
            draftBusy ||
            (yours.length === 0 && theirs.length === 0)
          }
          onClick={() => void submitTrade(true)}
        >
          {sendBusy ? "Sending…" : "Send trade"}
        </Button>
        <Link
          href="/trades"
          className="inline-flex items-center justify-center gap-mca-sm rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-base py-mca-tight text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:border-mca-border-interactive hover:bg-mca-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface active:scale-[0.98]"
        >
          Cancel
        </Link>
      </div>

      <FtueOverlay storageKey="mca:ftue:trade-new" surfaceName="trade-new" title="Building a trade">
        <p>
          Load your partner&apos;s cards, then add your offer and what you want from them. You can save a draft and send
          when both sides look right.
        </p>
      </FtueOverlay>
    </div>
  );
}
