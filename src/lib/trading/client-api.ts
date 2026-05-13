import { logClientCollectionFetchTiming } from "@/lib/client/dev-client-perf";
import { fetchStaleWhileRevalidate } from "@/lib/client/stale-whilst-revalidate";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import type { TradeCardLine, TradeRecord, TradeSummaryStats } from "@/lib/trading/types";

const json = async <T>(res: Response): Promise<T> => {
  return (await res.json().catch(() => ({}))) as T;
};

function isEnvelopeFailure(raw: Record<string, unknown>, resOk: boolean): boolean {
  if (!resOk) return true;
  if (raw.ok === false) return true;
  if (raw.success === false) return true;
  return false;
}

function unwrapPayload<T extends Record<string, unknown>>(raw: Record<string, unknown>): T {
  if (raw.ok === true && raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    return raw.data as T;
  }
  return raw as T;
}

function errorMessageFromBody(raw: Record<string, unknown>, fallback: string): string {
  if (raw.ok === false && raw.error && typeof raw.error === "object" && raw.error !== null) {
    const e = raw.error as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
  }
  if (typeof raw.error === "string") return raw.error;
  return fallback;
}

export async function fetchTradesList(query: string): Promise<
  { ok: true; trades: TradeRecord[] } | { ok: false; error: string }
> {
  const cacheKey = `trades:list:${query || "default"}`;
  return fetchStaleWhileRevalidate(
    cacheKey,
    async () => {
      const started = typeof performance !== "undefined" ? performance.now() : 0;
      const res = await fetch(`/api/trades/list${query}`, {
        cache: "no-store",
        credentials: "include",
      });
      logClientCollectionFetchTiming(
        "trades_list",
        `/api/trades/list${query}`,
        started,
        res.ok,
        res.status
      );
      const body = await json<Record<string, unknown>>(res);
      if (isEnvelopeFailure(body, res.ok)) {
        return { ok: false as const, error: errorMessageFromBody(body, "Failed to load trades") };
      }
      const data = unwrapPayload<{ trades?: TradeRecord[] }>(body);
      return { ok: true as const, trades: Array.isArray(data.trades) ? data.trades : [] };
    },
    { staleMs: 15_000, maxAgeMs: 120_000 }
  );
}

/** Line items only (lighter than full trade) for realtime merges. */
export async function fetchTradeItemsSides(tradeId: string): Promise<
  | { ok: true; offerSideA: TradeCardLine[]; offerSideB: TradeCardLine[] }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/trades/${encodeURIComponent(tradeId)}/items`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = await json<Record<string, unknown>>(res);
  if (isEnvelopeFailure(body, res.ok)) {
    return { ok: false, error: errorMessageFromBody(body, "Failed to load trade items") };
  }
  const data = unwrapPayload<{ offerSideA?: TradeCardLine[]; offerSideB?: TradeCardLine[] }>(body);
  return {
    ok: true,
    offerSideA: Array.isArray(data.offerSideA) ? data.offerSideA : [],
    offerSideB: Array.isArray(data.offerSideB) ? data.offerSideB : [],
  };
}

export async function fetchTrade(tradeId: string): Promise<
  { ok: true; trade: TradeRecord } | { ok: false; error: string }
> {
  const res = await fetchWithRetry(`/api/trades/${encodeURIComponent(tradeId)}`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = await json<Record<string, unknown>>(res);
  if (isEnvelopeFailure(body, res.ok)) {
    return { ok: false, error: errorMessageFromBody(body, "Trade not found") };
  }
  const data = unwrapPayload<{ trade?: TradeRecord }>(body);
  if (!data.trade) return { ok: false, error: "Trade not found" };
  return { ok: true, trade: data.trade };
}

export async function patchTradeAction(
  tradeId: string,
  action: string
): Promise<{ ok: true; trade: TradeRecord } | { ok: false; error: string }> {
  const res = await fetchWithRetry(`/api/trades/${encodeURIComponent(tradeId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action }),
  });
  const body = await json<Record<string, unknown>>(res);
  if (isEnvelopeFailure(body, res.ok)) {
    return { ok: false, error: errorMessageFromBody(body, "Action failed") };
  }
  const data = unwrapPayload<{ trade?: TradeRecord }>(body);
  if (!data.trade) return { ok: false, error: "Action failed" };
  return { ok: true, trade: data.trade };
}

export async function postTradeMessage(
  tradeId: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetchWithRetry(`/api/trades/${encodeURIComponent(tradeId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });
  const body = await json<Record<string, unknown>>(res);
  if (isEnvelopeFailure(body, res.ok)) {
    return { ok: false, error: errorMessageFromBody(body, "Could not send") };
  }
  return { ok: true };
}

export type CreateTradePayload = {
  counterpartyId: string;
  sendNow: boolean;
  offerLines: { cardId: string; quantity: number }[];
  requestLines: { cardId: string; quantity: number }[];
};

export async function postCreateTrade(payload: CreateTradePayload): Promise<
  | { ok: true; trade: TradeRecord; summary: TradeSummaryStats }
  | { ok: false; error: string }
> {
  const res = await fetchWithRetry("/api/trades/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = await json<Record<string, unknown>>(res);
  if (isEnvelopeFailure(body, res.ok)) {
    return { ok: false, error: errorMessageFromBody(body, "Could not create trade") };
  }
  const data = unwrapPayload<{ trade?: TradeRecord; summary?: TradeSummaryStats }>(body);
  if (!data.trade) return { ok: false, error: "Trade created but response was invalid." };
  return {
    ok: true,
    trade: data.trade,
    summary:
      data.summary ?? { totalCards: 0, sets: [], rarityCounts: {} },
  };
}
