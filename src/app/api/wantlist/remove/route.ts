import { removeWantListEntry } from "@/lib/matching/index-maintenance";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function DELETE_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { cardId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cardId =
    typeof body.cardId === "string" && body.cardId.trim().length > 0
      ? body.cardId.trim()
      : null;

  if (!cardId || !isUuidString(cardId)) {
    return NextResponse.json({ error: "cardId must be a valid UUID" }, { status: 400 });
  }

  try {
    await removeWantListEntry(supabase, user.id, cardId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not remove wantlist entry";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, cardId });
}

export const DELETE = defineRouteSimple("DELETE /api/wantlist/remove", DELETE_handler);
