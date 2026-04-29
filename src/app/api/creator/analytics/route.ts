import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: string;
    guideId?: string;
  } | null;

  if (!body?.kind || typeof body.kind !== "string") {
    return NextResponse.json({ error: "kind required" }, { status: 400 });
  }

  if (body.kind === "deck_guide_view") {
    const gid = typeof body.guideId === "string" ? body.guideId.trim() : "";
    if (!gid || !isUuidString(gid)) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }
    const { error } = await supabase.rpc("increment_deck_guide_views", { p_guide_id: gid });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
}

export const POST = defineRouteSimple("POST /api/creator/analytics", POST_handler);
