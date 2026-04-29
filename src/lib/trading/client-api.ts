import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import type { TradeCardLine, TradeRecord, TradeSummaryStats } from "@/lib/trading/types";

const json = async <T>(res: Response): Promise<T> => {
  return (await res.json().catch(() => ({}))) as T;
};

export async function fetchTradesList(query: string): Promise<
  { ok: true; trades: TradeRecord[] } | { ok: false; error: string }
> {
  const res = await fetch(`/api/trades/list${query}`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = await json<{ trades?: TradeRecord[]; error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to load trades" };
  return { ok: true, trades: Array.isArray(body.trades) ? body.trades : [] };
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
  const body = await json<{
    offerSideA?: TradeCardLine[];
    offerSideB?: TradeCardLine[];
    error?: string;
  }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to load trade items" };
  return {
    ok: true,
    offerSideA: Array.isArray(body.offerSideA) ? body.offerSideA : [],
    offerSideB: Array.isArray(body.offerSideB) ? body.offerSideB : [],
  };
}

export async function fetchTrade(tradeId: string): Promise<
  { ok: true; trade: TradeRecord } | { ok: false; error: string }
> {
  const res = await fetchWithRetry(`/api/trades/${encodeURIComponent(tradeId)}`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = await json<{ trade?: TradeRecord; error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Trade not found" };
  if (!body.trade) return { ok: false, error: "Trade not found" };
  return { ok: true, trade: body.trade };
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
  const body = await json<{ error?: string; trade?: TradeRecord }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Action failed" };
  if (!body.trade) return { ok: false, error: "Action failed" };
  return { ok: true, trade: body.trade };
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
  const body = await json<{ error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Could not send" };
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
  const body = await json<{
    error?: string;
    trade?: TradeRecord;
    summary?: TradeSummaryStats;
  }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Could not create trade" };
  if (!body.trade) return { ok: false, error: "Trade created but response was invalid." };
  return {
    ok: true,
    trade: body.trade,
    summary:
      body.summary ?? { totalCards: 0, sets: [], rarityCounts: {} },
  };
}
