import { getUserTrades } from "@/lib/trading/db";
import type { TradeRecord, TradeStatus } from "@/lib/trading/types";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trades = await getUserTrades(supabase, user.id);
  const filtered = filterTrades(trades, new URL(request.url).searchParams);

  return NextResponse.json({ trades: filtered });
}

export const GET = defineRouteSimple("GET /api/trades/list", GET_handler);
