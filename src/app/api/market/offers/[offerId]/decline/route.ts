import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/offers/decline", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const offerId = context.params.offerId?.trim();
  if (!offerId || !isUuidString(offerId)) {
    return NextResponse.json({ error: "Invalid offer id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: gErr } = await supabase
    .from("market_offers")
    .select("id, thread_id, from_user_id, to_user_id, status")
    .eq("id", offerId)
    .maybeSingle();

  if (gErr) {
    return NextResponse.json({ error: gErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Offer is not pending" }, { status: 409 });
  }
  if (row.to_user_id !== user.id) {
    return NextResponse.json({ error: "Only the recipient can decline" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("market_offers")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", offerId)
    .select("id, thread_id, status, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("market.offer.decline", { offerId, threadId: row.thread_id }, CTX);
  return NextResponse.json({ offer: data });
}

export const POST = defineRoute("POST /api/market/offers/[offerId]/decline", POST_handler);
