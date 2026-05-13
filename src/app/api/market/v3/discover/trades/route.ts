import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { ApiErrorCode } from "@/lib/api/api-error-codes";
import type { MarketplaceDiscoveryTradeV3DTO } from "@/lib/dto/marketplace-v3";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: followingRows } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", session.userId)
    .limit(80);
  const following = (followingRows ?? []).map((r) => r.following_id).filter(Boolean);

  const peerList = [...new Set(following)].slice(0, 40);
  const inList = peerList.length ? peerList.join(",") : "";

  let q = supabase
    .from("trades")
    .select("id, status, created_at, created_by, counterparty_id")
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(40);

  if (inList.length > 0) {
    q = q.or(
      `created_by.eq.${session.userId},counterparty_id.eq.${session.userId},created_by.in.(${inList}),counterparty_id.in.(${inList})`
    );
  } else {
    q = q.or(`created_by.eq.${session.userId},counterparty_id.eq.${session.userId}`);
  }

  const { data: rows, error } = await q;

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  const trades: MarketplaceDiscoveryTradeV3DTO[] = (rows ?? []).slice(0, 20).map((r) => {
    const party = r.created_by === session.userId || r.counterparty_id === session.userId;
    return {
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      anonymized: !party,
    };
  });

  return successJson(ctx, { trades });
}

export const GET = defineRouteSimple("GET /api/market/v3/discover/trades", GET_handler);
