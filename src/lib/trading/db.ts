import { log } from "@/lib/logging/log";
import type { Database } from "@/lib/supabase/types";
import type {
  TradeCardLine,
  TradeLineInput,
  TradeMessage,
  TradeRecord,
  TradeStatus,
} from "@/lib/trading/types";
import {
  canApplyAction,
  isTradeStatus,
  validateDraftLines,
} from "@/lib/trading/validation";
import type { TradeAction } from "@/lib/trading/validation";
import type { SupabaseClient } from "@supabase/supabase-js";

type CardJoin = {
  id: string;
  name: string;
  rarity: string | null;
  image_url: string | null;
  binder_id: string;
  binders: { name: string | null } | null;
};

type ItemJoin = {
  id: string;
  owner_id: string;
  card_id: string;
  quantity: number;
  side: string;
  cards: CardJoin | null;
};

type TradeJoin = {
  id: string;
  created_by: string;
  counterparty_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  trade_items: ItemJoin[] | null;
};

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(-8);
}

function partyLabels(createdBy: string, counterpartyId: string, viewerId: string): {
  partyALabel: string;
  partyBLabel: string;
} {
  const isCreator = viewerId === createdBy;
  return {
    partyALabel: isCreator ? "You" : `Trader · ${shortId(createdBy)}`,
    partyBLabel: isCreator ? `Partner · ${shortId(counterpartyId)}` : "You",
  };
}

function itemToLine(item: ItemJoin): TradeCardLine | null {
  const c = item.cards;
  if (!c) return null;
  return {
    id: item.id,
    cardId: c.id,
    name: c.name,
    setName: null,
    rarity: c.rarity,
    imageUrl: c.image_url,
    binderId: c.binder_id,
    binderName: c.binders?.name ?? null,
    quantity: item.quantity,
  };
}

/** Map joined `trade_items` rows to offer sides (creator offer vs counterparty request). */
export function mapTradeItemsJoinToSides(
  items: ItemJoin[],
  createdBy: string,
  counterpartyId: string
): { offerSideA: TradeCardLine[]; offerSideB: TradeCardLine[] } {
  const offerSideA: TradeCardLine[] = [];
  const offerSideB: TradeCardLine[] = [];
  for (const it of items) {
    const line = itemToLine(it);
    if (!line) continue;
    if (it.side === "offer" && it.owner_id === createdBy) {
      offerSideA.push(line);
    } else if (it.side === "request" && it.owner_id === counterpartyId) {
      offerSideB.push(line);
    }
  }
  return { offerSideA, offerSideB };
}

function mapTradeRow(row: TradeJoin, viewerId: string): TradeRecord | null {
  if (!isTradeStatus(row.status)) return null;
  const items = row.trade_items ?? [];
  const { offerSideA, offerSideB } = mapTradeItemsJoinToSides(items, row.created_by, row.counterparty_id);
  const labels = partyLabels(row.created_by, row.counterparty_id, viewerId);
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    counterpartyId: row.counterparty_id,
    viewerIsCreator: viewerId === row.created_by,
    offerSideA,
    offerSideB,
    partyALabel: labels.partyALabel,
    partyBLabel: labels.partyBLabel,
  };
}

const ITEM_SELECT = `
  id,
  owner_id,
  card_id,
  quantity,
  side,
  cards (
    id,
    name,
    rarity,
    image_url,
    binder_id,
    binders ( name )
  )
`;

export async function getUserTrades(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TradeRecord[]> {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id,
      created_by,
      counterparty_id,
      status,
      created_at,
      updated_at,
      trade_items ( ${ITEM_SELECT} )
    `
    )
    .or(`created_by.eq.${userId},counterparty_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return (data as TradeJoin[])
    .map((row) => mapTradeRow(row, userId))
    .filter((r): r is TradeRecord => r !== null);
}

export async function getTradeById(
  supabase: SupabaseClient<Database>,
  tradeId: string,
  userId: string
): Promise<TradeRecord | null> {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id,
      created_by,
      counterparty_id,
      status,
      created_at,
      updated_at,
      trade_items ( ${ITEM_SELECT} )
    `
    )
    .eq("id", tradeId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as TradeJoin;
  if (row.created_by !== userId && row.counterparty_id !== userId) {
    return null;
  }
  const base = mapTradeRow(row, userId);
  if (!base) return null;

  const { data: msgs } = await supabase
    .from("trade_messages")
    .select("id, sender_id, message, created_at")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });

  const messages: TradeMessage[] = (msgs ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    message: m.message,
    createdAt: m.created_at,
  }));

  return { ...base, messages };
}

/** Trade line items only (for realtime merge); RLS enforces participant access. */
export async function getTradeItemsSidesByTradeId(
  supabase: SupabaseClient<Database>,
  tradeId: string,
  userId: string
): Promise<{ offerSideA: TradeCardLine[]; offerSideB: TradeCardLine[] } | null> {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id,
      created_by,
      counterparty_id,
      trade_items ( ${ITEM_SELECT} )
    `
    )
    .eq("id", tradeId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as TradeJoin;
  if (row.created_by !== userId && row.counterparty_id !== userId) {
    return null;
  }
  return mapTradeItemsJoinToSides(row.trade_items ?? [], row.created_by, row.counterparty_id);
}

/** Creates an empty trade in `draft` (no line items). */
async function insertEmptyTradeDraft(
  supabase: SupabaseClient<Database>,
  userId: string,
  counterpartyId: string
): Promise<{ ok: true; tradeId: string } | { ok: false; error: string }> {
  if (!userId?.trim() || !counterpartyId?.trim()) {
    return { ok: false, error: "userId and counterpartyId are required." };
  }
  if (userId === counterpartyId) {
    return { ok: false, error: "Counterparty must differ from your user id." };
  }

  const { data: trade, error: te } = await supabase
    .from("trades")
    .insert({
      created_by: userId,
      counterparty_id: counterpartyId,
      status: "draft",
    })
    .select("id")
    .single();

  if (te || !trade) {
    return {
      ok: false,
      error: te?.message.includes("foreign key")
        ? "Counterparty is not a valid member."
        : te?.message ?? "Could not create trade.",
    };
  }

  return { ok: true, tradeId: trade.id };
}

async function fetchCardsMeta(
  supabase: SupabaseClient<Database>,
  cardIds: string[]
): Promise<Map<string, { user_id: string }>> {
  if (cardIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("cards")
    .select("id, user_id")
    .in("id", cardIds);
  const map = new Map<string, { user_id: string }>();
  if (error || !data) return map;
  for (const c of data) {
    map.set(c.id, { user_id: c.user_id });
  }
  return map;
}

async function assertCardsNotLockedElsewhere(
  supabase: SupabaseClient<Database>,
  cardIds: string[],
  excludeTradeId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (cardIds.length === 0) return { ok: true };
  const { data, error } = await supabase
    .from("trade_items")
    .select("card_id, trade_id")
    .in("card_id", cardIds);

  if (error) {
    return { ok: false, error: error.message };
  }

  const tradeIds = [...new Set((data ?? []).map((r) => r.trade_id))];
  if (tradeIds.length === 0) return { ok: true };

  const { data: trades, error: te } = await supabase
    .from("trades")
    .select("id, status")
    .in("id", tradeIds);

  if (te) return { ok: false, error: te.message };

  const statusById = new Map((trades ?? []).map((t) => [t.id, t.status]));
  const active = new Set(["draft", "sent", "countered"]);

  for (const row of data ?? []) {
    const st = statusById.get(row.trade_id);
    if (!st || !active.has(st)) continue;
    if (excludeTradeId && row.trade_id === excludeTradeId) continue;
    return {
      ok: false,
      error: "One or more cards are already listed in another open trade.",
    };
  }
  return { ok: true };
}

export type CreateTradeWithItemsParams = {
  creatorId: string;
  counterpartyId: string;
  offerLines: TradeLineInput[];
  requestLines: TradeLineInput[];
  initialStatus: "draft" | "sent";
};

async function createTradeWithItems(
  supabase: SupabaseClient<Database>,
  params: CreateTradeWithItemsParams
): Promise<{ ok: true; tradeId: string } | { ok: false; error: string }> {
  const v = validateDraftLines(params.offerLines, params.requestLines);
  if (!v.ok) return v;

  if (params.creatorId === params.counterpartyId) {
    return { ok: false, error: "Choose a different counterparty than yourself." };
  }

  const allIds = [
    ...params.offerLines.map((l) => l.cardId),
    ...params.requestLines.map((l) => l.cardId),
  ];
  const meta = await fetchCardsMeta(supabase, allIds);
  if (meta.size !== allIds.length) {
    return { ok: false, error: "One or more cards were not found." };
  }

  for (const l of params.offerLines) {
    const m = meta.get(l.cardId);
    if (!m || m.user_id !== params.creatorId) {
      return { ok: false, error: "You can only offer cards from your own collection." };
    }
  }
  for (const l of params.requestLines) {
    const m = meta.get(l.cardId);
    if (!m || m.user_id !== params.counterpartyId) {
      return {
        ok: false,
        error: "Requested cards must belong to your counterparty’s collection.",
      };
    }
  }

  const lock = await assertCardsNotLockedElsewhere(supabase, allIds, null);
  if (!lock.ok) return lock;

  const { data: trade, error: te } = await supabase
    .from("trades")
    .insert({
      created_by: params.creatorId,
      counterparty_id: params.counterpartyId,
      status: params.initialStatus,
    })
    .select("id")
    .single();

  if (te || !trade) {
    return {
      ok: false,
      error: te?.message.includes("foreign key")
        ? "Counterparty is not a valid member."
        : te?.message ?? "Could not create trade.",
    };
  }

  const tradeId = trade.id;
  const rows: Database["public"]["Tables"]["trade_items"]["Insert"][] = [];

  for (const l of params.offerLines) {
    rows.push({
      trade_id: tradeId,
      owner_id: params.creatorId,
      card_id: l.cardId,
      quantity: l.quantity,
      side: "offer",
    });
  }
  for (const l of params.requestLines) {
    rows.push({
      trade_id: tradeId,
      owner_id: params.counterpartyId,
      card_id: l.cardId,
      quantity: l.quantity,
      side: "request",
    });
  }

  if (rows.length > 0) {
    const { error: ie } = await supabase.from("trade_items").insert(rows);
    if (ie) {
      await supabase.from("trades").delete().eq("id", tradeId);
      return { ok: false, error: ie.message };
    }
  }

  return { ok: true, tradeId };
}

export async function createTradeDraft(
  supabase: SupabaseClient<Database>,
  userId: string,
  counterpartyId: string
): Promise<{ ok: true; tradeId: string } | { ok: false; error: string }>;
export async function createTradeDraft(
  supabase: SupabaseClient<Database>,
  params: CreateTradeWithItemsParams
): Promise<{ ok: true; tradeId: string } | { ok: false; error: string }>;
export async function createTradeDraft(
  supabase: SupabaseClient<Database>,
  arg2: string | CreateTradeWithItemsParams,
  arg3?: string
): Promise<{ ok: true; tradeId: string } | { ok: false; error: string }> {
  if (typeof arg2 === "string" && typeof arg3 === "string") {
    return insertEmptyTradeDraft(supabase, arg2, arg3);
  }
  return createTradeWithItems(supabase, arg2 as CreateTradeWithItemsParams);
}

export async function addTradeItem(
  supabase: SupabaseClient<Database>,
  tradeId: string,
  ownerId: string,
  cardId: string,
  quantity: number,
  side: "offer" | "request"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: "quantity must be at least 1." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized." };
  }

  const { data: tr, error: e1 } = await supabase
    .from("trades")
    .select("id, created_by, counterparty_id, status")
    .eq("id", tradeId)
    .maybeSingle();

  if (e1 || !tr) return { ok: false, error: "Trade not found." };
  if (tr.created_by !== user.id && tr.counterparty_id !== user.id) {
    return { ok: false, error: "Forbidden." };
  }
  if (tr.status !== "draft" && tr.status !== "countered") {
    return { ok: false, error: "Items can only change while the trade is a draft or countered." };
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id, user_id")
    .eq("id", cardId)
    .maybeSingle();
  if (!card) return { ok: false, error: "Card not found." };
  if (card.user_id !== ownerId) {
    return { ok: false, error: "Card owner does not match." };
  }
  if (side === "offer" && ownerId !== tr.created_by) {
    return { ok: false, error: "Offer cards must belong to the trade creator." };
  }
  if (side === "request" && ownerId !== tr.counterparty_id) {
    return { ok: false, error: "Requested cards must belong to the counterparty." };
  }

  const lock = await assertCardsNotLockedElsewhere(supabase, [cardId], tradeId);
  if (!lock.ok) return lock;

  const { error } = await supabase.from("trade_items").insert({
    trade_id: tradeId,
    owner_id: ownerId,
    card_id: cardId,
    quantity,
    side,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Sets `trades.status` when `userId` is a participant. */
async function updateTradeStatusDirect(
  supabase: SupabaseClient<Database>,
  tradeId: string,
  userId: string,
  newStatus: TradeStatus
): Promise<{ ok: true; status: TradeStatus } | { ok: false; error: string }> {
  const { data: tr, error } = await supabase
    .from("trades")
    .select("id, created_by, counterparty_id, status")
    .eq("id", tradeId)
    .maybeSingle();

  if (error || !tr) return { ok: false, error: "Trade not found." };
  if (tr.created_by !== userId && tr.counterparty_id !== userId) {
    return { ok: false, error: "Forbidden." };
  }
  if (!isTradeStatus(newStatus)) {
    return { ok: false, error: "Invalid status." };
  }

  const { error: ue } = await supabase.from("trades").update({ status: newStatus }).eq("id", tradeId);

  if (ue) return { ok: false, error: ue.message };
  log.trade.info("status.updated", {
    tradeId,
    from: tr.status,
    to: newStatus,
  });
  return { ok: true, status: newStatus };
}

export async function updateTradeStatus(
  supabase: SupabaseClient<Database>,
  tradeId: string,
  userId: string,
  newStatus: TradeStatus
): Promise<{ ok: true; status: TradeStatus } | { ok: false; error: string }>;
export async function updateTradeStatus(
  supabase: SupabaseClient<Database>,
  params: {
    tradeId: string;
    userId: string;
    action: TradeAction;
  }
): Promise<{ ok: true; status: TradeStatus } | { ok: false; error: string }>;
export async function updateTradeStatus(
  supabase: SupabaseClient<Database>,
  arg2: string | { tradeId: string; userId: string; action: TradeAction },
  userId?: string,
  newStatus?: TradeStatus
): Promise<{ ok: true; status: TradeStatus } | { ok: false; error: string }> {
  if (typeof arg2 === "string" && typeof userId === "string" && newStatus !== undefined) {
    return updateTradeStatusDirect(supabase, arg2, userId, newStatus);
  }
  const params = arg2 as { tradeId: string; userId: string; action: TradeAction };
  const { data: tr, error } = await supabase
    .from("trades")
    .select("id, created_by, counterparty_id, status")
    .eq("id", params.tradeId)
    .maybeSingle();

  if (error || !tr) return { ok: false, error: "Trade not found." };
  if (!isTradeStatus(tr.status)) return { ok: false, error: "Invalid trade state." };

  const role =
    params.userId === tr.created_by
      ? "creator"
      : params.userId === tr.counterparty_id
        ? "counterparty"
        : null;
  if (!role) return { ok: false, error: "Forbidden." };

  const next = canApplyAction(tr.status, params.action, role);
  if (!next.ok) return next;

  const { error: ue } = await supabase
    .from("trades")
    .update({ status: next.next })
    .eq("id", params.tradeId);

  if (ue) return { ok: false, error: ue.message };
  log.trade.info("status.updated", {
    tradeId: params.tradeId,
    from: tr.status,
    to: next.next,
    action: params.action,
  });
  return { ok: true, status: next.next };
}

export async function addTradeMessage(
  supabase: SupabaseClient<Database>,
  tradeId: string,
  senderId: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }>;
export async function addTradeMessage(
  supabase: SupabaseClient<Database>,
  params: { tradeId: string; senderId: string; message: string }
): Promise<{ ok: true } | { ok: false; error: string }>;
export async function addTradeMessage(
  supabase: SupabaseClient<Database>,
  arg2: string | { tradeId: string; senderId: string; message: string },
  senderId?: string,
  message?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tradeIdResolved = typeof arg2 === "string" ? arg2 : arg2.tradeId;
  const senderIdResolved = typeof arg2 === "string" ? (senderId as string) : arg2.senderId;
  const messageResolved = typeof arg2 === "string" ? (message as string) : arg2.message;

  const trimmed = messageResolved.trim();
  if (!trimmed) return { ok: false, error: "Message is required." };

  const { data: tr } = await supabase
    .from("trades")
    .select("created_by, counterparty_id")
    .eq("id", tradeIdResolved)
    .maybeSingle();
  if (!tr) return { ok: false, error: "Trade not found." };
  if (tr.created_by !== senderIdResolved && tr.counterparty_id !== senderIdResolved) {
    return { ok: false, error: "Forbidden." };
  }

  const { error } = await supabase.from("trade_messages").insert({
    trade_id: tradeIdResolved,
    sender_id: senderIdResolved,
    message: trimmed,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
