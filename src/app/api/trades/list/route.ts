import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { getUserTrades } from "@/lib/trading/db";
import type { TradeRecord, TradeStatus } from "@/lib/trading/types";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

function filterTrades(trades: TradeRecord[], sp: URLSearchParams): TradeRecord[] {
  let out = trades;
  const status = sp.get("status");
  if (status && status !== "all") {
    out = out.filter((t) => t.status === (status as TradeStatus));
  }
  const binder = sp.get("binder");
  if (binder && binder !== "all") {
    out = out.filter((t) =>
      [...t.offerSideA, ...t.offerSideB].some((l) => l.binderId === binder)
    );
  }
  const setName = sp.get("set");
  if (setName && setName !== "all") {
    out = out.filter((t) =>
      [...t.offerSideA, ...t.offerSideB].some((l) => l.setName === setName)
    );
  }
  const rarity = sp.get("rarity");
  if (rarity && rarity !== "all") {
    out = out.filter((t) =>
      [...t.offerSideA, ...t.offerSideB].some((l) => l.rarity === rarity)
    );
  }
  return out;
}

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const loaded = await getUserTrades(supabase, session.userId);
  if (!loaded.ok) {
    return errorJson(ctx, safePublicDbMessage(loaded.message), 500);
  }

  const filtered = filterTrades(loaded.trades, new URL(request.url).searchParams);
  return successJson(ctx, { trades: filtered });
}

export const GET = defineRouteSimple("GET /api/trades/list", GET_handler);
