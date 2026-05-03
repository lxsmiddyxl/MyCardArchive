import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/nod", surfaceName: "social" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { toUserId?: string } = {};
  try {
    body = (await request.json()) as { toUserId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toUserId = typeof body.toUserId === "string" ? body.toUserId.trim() : "";
  if (!toUserId || !isUuidString(toUserId)) {
    return NextResponse.json({ error: "Invalid target user id" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("post_social_nod", { p_to_user_id: toUserId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const row = data as { ok?: boolean; reason?: string } | null;
  if (row && row.ok === false && row.reason === "daily_cap") {
    return NextResponse.json({ ok: false, reason: "daily_cap" }, { status: 429 });
  }
  if (row && row.ok === false) {
    return NextResponse.json({ ok: false, reason: row.reason ?? "unknown" }, { status: 400 });
  }
  mcaLog.event("social.nod", { toUserId }, CTX);
  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/social/nod", POST_handler);
