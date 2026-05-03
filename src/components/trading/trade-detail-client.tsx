"use client";

import { TradeCardRow } from "@/components/trading/trade-card-row";
import { TradeOfferPanel } from "@/components/trading/trade-offer-panel";
import { TradeStatusBadge } from "@/components/trading/trade-status-badge";
import { TradeTimeline } from "@/components/trading/trade-timeline";
import { Breadcrumb, Button, Field, InlineError, LoadingSpinner, NavBackLink, Panel } from "@/mca-ui";
import {
  fetchTrade,
  fetchTradeItemsSides,
  patchTradeAction,
  postTradeMessage,
} from "@/lib/trading/client-api";
import {
  applyTradeMessagesRealtime,
  TRADE_ITEMS_DETAIL_MERGE_DEBOUNCE_MS,
  tradeItemsRealtimeTargetsTradeId,
  tradesRealtimeTargetsTradeId,
} from "@/lib/trading/trade-realtime";
import { connectTradeNegotiationBroadcast, type TradeNegotiationConnection } from "@/lib/trading/trade-broadcast";
import type { TradeCardLine, TradeRecord } from "@/lib/trading/types";
import { devtoolsSilentRefetch } from "@/lib/dev/realtime-devtools-state";
import { AuthenticatedPresenceShell, useAppWidePresence } from "@/components/realtime/app-wide-presence";
import {
  isPartnerViewingTrade,
  subscribeToTradeItems,
  subscribeToTradeMessages,
  subscribeToTrades,
  subscribeTradeRoomPresence,
} from "@/lib/realtime/channels";
import { mcaLog } from "@/lib/logging/mca-log-client";
import {
  enqueueOfflineAction,
  finalizeOfflineAction,
  isLikelyOfflineError,
  listOfflineActions,
} from "@/lib/mobile/offline-action-queue";
import { useAsyncState } from "@/lib/client";
import { MUTATION_LIMITS } from "@/lib/validation/mutation-limits";
import { cn } from "@/lib/ui/cn";
import { useMicroFlash } from "@/lib/ui/use-micro-flash";
import {
  useListRenderStats,
  useRealtimeEventCounter,
  useSuspenseProfile,
} from "@/lib/telemetry";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type Props = { tradeId: string; currentUserId: string };

export function TradeDetailClient({ tradeId, currentUserId }: Props) {
  return (
    <AuthenticatedPresenceShell userId={currentUserId}>
      <TradeDetailInner tradeId={tradeId} currentUserId={currentUserId} />
    </AuthenticatedPresenceShell>
  );
}

function TradeDetailInner({ tradeId, currentUserId }: Props) {
  const { isUserOnline } = useAppWidePresence();
  const {
    data: trade,
    setData: setTrade,
    loading: tradeLoadCycle,
    setLoading: setTradeLoading,
  } = useAsyncState<TradeRecord>();
  const [error, setError] = useState<string | null>(null);
  const loading = tradeLoadCycle || (trade === null && !error);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const messageRef = useRef(message);
  messageRef.current = message;
  const [msgBusy, setMsgBusy] = useState(false);
  const [partnerViewing, setPartnerViewing] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerReviewingOffer, setPartnerReviewingOffer] = useState(false);
  const [offerUpdatedBanner, setOfferUpdatedBanner] = useState(false);
  const [negotiationConflict, setNegotiationConflict] = useState(false);
  const [viewStale, setViewStale] = useState(false);
  const partnerUserIdRef = useRef("");
  const negotiationRef = useRef<TradeNegotiationConnection | null>(null);
  const partnerTypingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const partnerReviewingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const typingSendTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const tradeSyncInitializedRef = useRef(false);
  const prevTradeUpdatedAtRef = useRef<string | null>(null);
  const conflictLoggedForUpdatedAtRef = useRef<string | null>(null);
  const { active: silentFlashActive, trigger: triggerSilentFlash } = useMicroFlash(200);
  const { active: newMsgFlashActive, trigger: triggerNewMessage } = useMicroFlash(220);

  const telemetryCtx = useMemo(
    () => ({
      componentName: "TradeDetailClient",
      surfaceName: "trade-detail",
      traceId: tradeId,
    }),
    [tradeId]
  );
  useSuspenseProfile("trade-detail", telemetryCtx);
  useListRenderStats("trade-messages", trade?.messages?.length ?? 0, telemetryCtx);
  const rtInc = useRealtimeEventCounter("trade-channels", telemetryCtx);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) {
      devtoolsSilentRefetch(`trade-detail:${tradeId}`);
    }
    if (!opts?.silent) {
      setTradeLoading(true);
      setError(null);
    }
    const lkgKey = `mca:lkg:trade:${tradeId}`;
    try {
      const out = await fetchTrade(tradeId);
      if (!out.ok) throw new Error(out.error);
      if (opts?.silent) {
        startTransition(() => setTrade(out.trade));
        triggerSilentFlash();
      } else {
        setTrade(out.trade);
        setViewStale(false);
      }
      try {
        sessionStorage.setItem(lkgKey, JSON.stringify(out.trade));
      } catch {
        /* quota / private mode */
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load trade";
      setError(msg);
      if (!opts?.silent) {
        try {
          const raw = sessionStorage.getItem(lkgKey);
          if (raw) {
            const parsed = JSON.parse(raw) as TradeRecord;
            if (parsed && parsed.id === tradeId) {
              setTrade(parsed);
              setViewStale(true);
              setError(null);
              return;
            }
          }
        } catch {
          /* ignore */
        }
        setTrade(null);
      }
    } finally {
      if (!opts?.silent) setTradeLoading(false);
    }
  }, [tradeId, triggerSilentFlash, setTradeLoading, setTrade]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    tradeSyncInitializedRef.current = false;
    prevTradeUpdatedAtRef.current = null;
    conflictLoggedForUpdatedAtRef.current = null;
    setNegotiationConflict(false);
    setOfferUpdatedBanner(false);
  }, [tradeId]);

  useEffect(() => {
    const conn = connectTradeNegotiationBroadcast(tradeId, currentUserId, (p) => {
      if (p.kind === "typing") {
        setPartnerTyping(true);
        if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
        partnerTypingTimerRef.current = setTimeout(() => setPartnerTyping(false), 2800);
      } else if (p.kind === "reviewing_offer") {
        setPartnerReviewingOffer(true);
        if (partnerReviewingTimerRef.current) clearTimeout(partnerReviewingTimerRef.current);
        partnerReviewingTimerRef.current = setTimeout(() => setPartnerReviewingOffer(false), 4200);
      }
    });
    negotiationRef.current = conn;
    return () => {
      conn.dispose();
      negotiationRef.current = null;
    };
  }, [tradeId, currentUserId]);

  useEffect(() => {
    if (!trade) return;
    if (!tradeSyncInitializedRef.current) {
      tradeSyncInitializedRef.current = true;
      prevTradeUpdatedAtRef.current = trade.updatedAt;
      return;
    }
    const prev = prevTradeUpdatedAtRef.current;
    if (prev === trade.updatedAt) return;
    prevTradeUpdatedAtRef.current = trade.updatedAt;
    if (messageRef.current.trim()) {
      setNegotiationConflict(true);
      if (conflictLoggedForUpdatedAtRef.current !== trade.updatedAt) {
        conflictLoggedForUpdatedAtRef.current = trade.updatedAt;
        mcaLog.event("trade.negotiation.conflict", { tradeId }, telemetryCtx);
      }
      return;
    }
    setOfferUpdatedBanner(true);
    const t = window.setTimeout(() => setOfferUpdatedBanner(false), 7000);
    return () => window.clearTimeout(t);
  }, [trade, trade?.updatedAt, tradeId, telemetryCtx]);

  useEffect(() => {
    const unsub = subscribeToTrades(currentUserId, (payload) => {
      if (!tradesRealtimeTargetsTradeId(tradeId, payload)) return;
      rtInc();
      void loadRef.current({ silent: true });
    });
    return unsub;
  }, [currentUserId, tradeId, rtInc]);

  useEffect(() => {
    const unsub = subscribeToTradeMessages(tradeId, (payload) => {
      rtInc();
      if (payload.eventType === "INSERT") {
        triggerNewMessage();
      }
      startTransition(() => {
        setTrade((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: applyTradeMessagesRealtime(prev.messages, payload) };
        });
      });
    });
    return unsub;
  }, [tradeId, triggerNewMessage, rtInc, setTrade]);

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeToTradeItems(tradeId, (payload) => {
      if (!tradeItemsRealtimeTargetsTradeId(tradeId, payload)) return;
      rtInc();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        void (async () => {
          const out = await fetchTradeItemsSides(tradeId);
          if (cancelled) return;
          if (!out.ok) return;
          setTrade((prev) => {
            if (!prev) return prev;
            return { ...prev, offerSideA: out.offerSideA, offerSideB: out.offerSideB };
          });
        })();
      }, TRADE_ITEMS_DETAIL_MERGE_DEBOUNCE_MS);
    });
    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      unsub();
    };
  }, [tradeId, rtInc, setTrade]);

  const runAction = useCallback(
    async (action: string) => {
      setActionBusy(action);
      setError(null);
      try {
        const out = await patchTradeAction(tradeId, action);
        if (!out.ok) throw new Error(out.error);
        setTrade(out.trade);
        mcaLog.event("trade.action.success", { action }, telemetryCtx);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setActionBusy(null);
      }
    },
    [tradeId, telemetryCtx, setTrade]
  );

  const sendMessage = useCallback(async () => {
    const trimmed = messageRef.current.trim();
    if (!trimmed) return;
    if (trimmed.length > MUTATION_LIMITS.tradeMessageMax) {
      setError(`Message is too long (max ${MUTATION_LIMITS.tradeMessageMax} characters).`);
      return;
    }
    setMsgBusy(true);
    setError(null);
    try {
      const out = await postTradeMessage(tradeId, trimmed);
      if (!out.ok) throw new Error(out.error);
      mcaLog.event(
        "trade.message.sent",
        { len: trimmed.length },
        telemetryCtx
      );
      setMessage("");
      void load({ silent: true });
    } catch (e) {
      if (isLikelyOfflineError(e)) {
        enqueueOfflineAction({ kind: "trade_message", tradeId, body: trimmed });
        setError(
          "You appear offline — message saved locally and will send when the connection is back."
        );
        setMessage("");
        mcaLog.event(
          "mobile.offline.queue",
          { kind: "trade_message", op: "enqueue_trade" },
          telemetryCtx
        );
      } else {
        setError(e instanceof Error ? e.message : "Could not send");
      }
    } finally {
      setMsgBusy(false);
    }
  }, [tradeId, load, telemetryCtx]);

  useEffect(() => {
    const flushQueued = async () => {
      const pending = listOfflineActions().filter(
        (a) => a.kind === "trade_message" && a.tradeId === tradeId
      );
      if (pending.length === 0) return;
      for (const p of pending) {
        if (p.kind !== "trade_message") continue;
        const out = await postTradeMessage(p.tradeId, p.body);
        if (out.ok) {
          finalizeOfflineAction(p.id, "synced");
          mcaLog.event(
            "mobile.offline.queue",
            { kind: "trade_message", op: "flush_ok", id: p.id },
            telemetryCtx
          );
          void load({ silent: true });
        }
      }
    };
    void flushQueued();
    const onOnline = () => void flushQueued();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [tradeId, load, telemetryCtx]);

  const onMessageChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setMessage(v);
    if (typingSendTimerRef.current) clearTimeout(typingSendTimerRef.current);
    typingSendTimerRef.current = setTimeout(() => {
      negotiationRef.current?.send("typing");
    }, 450);
  }, []);

  const onOfferInteraction = useCallback(() => {
    negotiationRef.current?.send("reviewing_offer");
  }, []);

  const panels = useMemo(() => {
    if (!trade) {
      return { left: [] as TradeCardLine[], right: [] as TradeCardLine[] };
    }
    if (trade.viewerIsCreator) {
      return { left: trade.offerSideA, right: trade.offerSideB };
    }
    return { left: trade.offerSideB, right: trade.offerSideA };
  }, [trade]);

  const partnerUserId = useMemo(() => {
    if (!trade) return "";
    return trade.viewerIsCreator ? trade.counterpartyId : trade.createdBy;
  }, [trade]);
  partnerUserIdRef.current = partnerUserId;

  useEffect(() => {
    if (!partnerUserId) {
      setPartnerViewing(false);
      return;
    }
    setPartnerViewing(isPartnerViewingTrade(tradeId, partnerUserId));
  }, [tradeId, partnerUserId]);

  useEffect(() => {
    const unsub = subscribeTradeRoomPresence(tradeId, currentUserId, () => {
      const pid = partnerUserIdRef.current;
      if (!pid) return;
      const next = isPartnerViewingTrade(tradeId, pid);
      setPartnerViewing((prev) => (prev === next ? prev : next));
    });
    return unsub;
  }, [tradeId, currentUserId]);

  const partnerOnline = partnerUserId ? isUserOnline(partnerUserId) : false;

  if (loading) {
    return (
      <div
        className="flex items-center gap-mca-md text-mca-body text-mca-ink-muted"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <LoadingSpinner className="size-6 text-mca-accent" aria-hidden />
        <span>Loading trade…</span>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="space-y-mca-md">
        <NavBackLink href="/trades">← Trades</NavBackLink>
        <Breadcrumb
          items={[{ label: "Trades", href: "/trades" }, { label: "Trade" }]}
          className="mt-mca-xs"
        />
        <InlineError>{error ?? "Trade not found."}</InlineError>
      </div>
    );
  }

  const leftTitle = trade.viewerIsCreator ? "Your offer" : "They request from you";
  const rightTitle = trade.viewerIsCreator ? "You request" : "They offer";

  const s = trade.status;
  const vc = trade.viewerIsCreator;

  return (
    <div className="space-y-mca-lg">
      <div
        className={cn(
          "flex flex-col gap-mca-md sm:flex-row sm:items-start sm:justify-between rounded-mca-block px-mca-sm py-mca-xs -mx-mca-sm transition-[box-shadow,background-color] duration-200 ease-mca-standard",
          silentFlashActive && "bg-mca-accent-strong/[0.06] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]"
        )}
      >
        <div>
          <NavBackLink href="/trades">← Trades</NavBackLink>
          <Breadcrumb
            items={[{ label: "Trades", href: "/trades" }, { label: trade.id }]}
            className="mt-mca-xs"
          />
          <div className="mt-mca-sm flex flex-wrap items-center gap-mca-sm">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mca-field-border bg-mca-chrome text-xs font-semibold uppercase tracking-wide text-mca-ink-strong"
              title={`Partner id ${trade.viewerIsCreator ? trade.counterpartyId : trade.createdBy}`}
              aria-hidden
            >
              {(trade.viewerIsCreator ? trade.counterpartyId : trade.createdBy)
                .replace(/-/g, "")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <h1 className="font-mono text-mca-h2 text-mca-ink-strong">{trade.id}</h1>
          </div>
          <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
            {trade.partyALabel} ↔ {trade.partyBLabel}
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">
            Updated {new Date(trade.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-mca-xs">
          <TradeStatusBadge status={trade.status} />
          {partnerReviewingOffer ? (
            <p
              className="rounded-full border border-mca-info-surface/45 bg-mca-info-surface/15 px-mca-sm py-mca-xs text-mca-caption text-mca-ink-body"
              title="Partner is focused on the offer panels"
            >
              Partner is reviewing your offer
            </p>
          ) : null}
          {partnerViewing ? (
            <p
              className="rounded-full border border-mca-focus/35 bg-mca-success-bold/10 px-mca-sm py-mca-xs text-mca-caption text-mca-success-soft/90"
              title="This trader is viewing your trade"
            >
              Partner viewing this trade
            </p>
          ) : partnerOnline ? (
            <p
              className="rounded-full border border-mca-field-border/80 bg-mca-chrome/60 px-mca-sm py-mca-xs text-mca-caption text-mca-ink-body"
              title="This user is currently online"
            >
              Partner online
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-mca-sm">
        {vc && s === "draft" ? (
          <Button
            type="button"
            variant="primary"
            disabled={Boolean(actionBusy)}
            onClick={() => void runAction("send")}
          >
            {actionBusy === "send" ? "…" : "Send"}
          </Button>
        ) : null}
        {vc && s === "sent" ? (
          <Button
            type="button"
            variant="tertiary"
            disabled={Boolean(actionBusy)}
            onClick={() => void runAction("withdraw")}
          >
            {actionBusy === "withdraw" ? "…" : "Withdraw"}
          </Button>
        ) : null}
        {!vc && (s === "sent" || s === "countered") ? (
          <>
            <Button
              type="button"
              variant="primary"
              disabled={Boolean(actionBusy)}
              onClick={() => void runAction("accept")}
            >
              {actionBusy === "accept" ? "…" : "Accept"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(actionBusy)}
              onClick={() => void runAction("decline")}
            >
              {actionBusy === "decline" ? "…" : "Decline"}
            </Button>
            {s === "sent" ? (
              <Button
                type="button"
                variant="tertiary"
                disabled={Boolean(actionBusy)}
                onClick={() => void runAction("counter")}
              >
                {actionBusy === "counter" ? "…" : "Counter"}
              </Button>
            ) : null}
          </>
        ) : null}
        {vc && s === "countered" ? (
          <Button
            type="button"
            variant="primary"
            disabled={Boolean(actionBusy)}
            onClick={() => void runAction("resend")}
          >
            {actionBusy === "resend" ? "…" : "Resend offer"}
          </Button>
        ) : null}
        {s === "accepted" ? (
          <Button
            type="button"
            variant="primary"
            disabled={Boolean(actionBusy)}
            onClick={() => void runAction("complete")}
          >
            {actionBusy === "complete" ? "…" : "Mark complete"}
          </Button>
        ) : null}
      </div>

      {error ? <InlineError>{error}</InlineError> : null}
      {offerUpdatedBanner ? (
        <Panel className="border border-mca-accent-strong/30 bg-mca-accent-strong/[0.07] p-mca-sm text-mca-caption text-mca-ink-body">
          Offer updated — the latest snapshot is shown below.
        </Panel>
      ) : null}
      {negotiationConflict ? (
        <Panel className="border border-mca-warning-tint/40 bg-mca-warning-surface/25 p-mca-sm text-mca-caption text-mca-ink-body">
          Another update arrived while you had a message drafted. Review the latest offer, then send your note.
          <button
            type="button"
            className="ml-mca-sm font-semibold text-mca-accent-strong underline-offset-2 hover:underline"
            onClick={() => setNegotiationConflict(false)}
          >
            Dismiss
          </button>
        </Panel>
      ) : null}
      {viewStale && trade ? (
        <Panel className="border border-mca-accent-strong/35 bg-mca-warning-surface/20 p-mca-sm text-mca-caption text-mca-warning-tint">
          Offline or server unreachable — showing the last trade snapshot saved in this browser.{" "}
          <button
            type="button"
            className="font-semibold text-mca-accent-strong/90 underline-offset-2 hover:underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </Panel>
      ) : null}

      <div className="grid gap-mca-lg lg:grid-cols-2">
        <TradeOfferPanel
          title={leftTitle}
          subtitle={trade.viewerIsCreator ? trade.partyALabel : "Your cards"}
          onOfferInteraction={onOfferInteraction}
        >
          {panels.left.length === 0 ? (
            <p className="text-mca-body text-mca-ink-subtle">No cards.</p>
          ) : (
            panels.left.map((line: TradeCardLine) => <TradeCardRow key={line.id} line={line} />)
          )}
        </TradeOfferPanel>
        <TradeOfferPanel
          title={rightTitle}
          subtitle={trade.viewerIsCreator ? trade.partyBLabel : "Their cards"}
          onOfferInteraction={onOfferInteraction}
        >
          {panels.right.length === 0 ? (
            <p className="text-mca-body text-mca-ink-subtle">No cards.</p>
          ) : (
            panels.right.map((line: TradeCardLine) => <TradeCardRow key={line.id} line={line} />)
          )}
        </TradeOfferPanel>
      </div>

      <TradeTimeline trade={trade} telemetryCtx={telemetryCtx} />

      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <div className="flex flex-wrap items-center justify-between gap-mca-sm">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Messages</p>
          {partnerTyping ? (
            <span className="text-mca-caption text-mca-ink-muted">Partner is typing…</span>
          ) : null}
        </div>
        <div
          role="log"
          aria-label="Trade messages"
          className={cn(
            "mt-mca-md max-h-56 space-y-mca-sm overflow-y-auto rounded-mca-block border bg-mca-surface-elevated/40 p-mca-sm transition-[box-shadow,border-color] duration-200 ease-mca-standard",
            newMsgFlashActive
              ? "border-mca-accent-strong/25 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]"
              : "border-mca-border/80"
          )}
        >
          {(trade.messages ?? []).length === 0 ? (
            <p className="text-mca-caption text-mca-ink-subtle">No messages yet.</p>
          ) : (
            trade.messages!.map((m) => (
              <div
                key={m.id}
                className="rounded-mca-control border border-mca-border/60 px-mca-sm py-mca-xs transition-[border-color,box-shadow] duration-200 ease-mca-standard"
              >
                <p className="text-mca-caption text-mca-ink-subtle">
                  {m.senderId === currentUserId ? "You" : "Partner"} ·{" "}
                  {new Date(m.createdAt).toLocaleString()}
                </p>
                <p className="text-mca-body text-mca-ink-soft">{m.message}</p>
              </div>
            ))
          )}
        </div>
        <div className="mt-mca-md flex flex-col gap-mca-sm sm:flex-row sm:items-end">
          <Field id="trade-msg" label="Add message" className="flex-1">
            <textarea
              id="trade-msg"
              value={message}
              onChange={onMessageChange}
              rows={2}
              autoComplete="off"
              aria-label="Message to your trade partner"
              placeholder="Write a message…"
              className="mca-input mt-0 w-full resize-none rounded-mca-card border-mca-border-subtle bg-mca-surface-elevated text-mca-body placeholder:text-mca-ink-subtle"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            className="transition-[transform,box-shadow,background-color,border-color] duration-200 ease-mca-standard active:scale-[0.98]"
            disabled={msgBusy || !message.trim()}
            onClick={() => void sendMessage()}
          >
            {msgBusy ? "…" : "Send"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
