import { removeWantListEntry, setWantListEntry } from "@/lib/matching/index-maintenance";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function PATCH_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { cardId?: unknown; quantity?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cardId =
    typeof body.cardId === "string" && body.cardId.trim().length > 0
      ? body.cardId.trim()
      : null;
  const quantityRaw = body.quantity;
  const quantity =
    typeof quantityRaw === "number" && Number.isFinite(quantityRaw)
      ? Math.floor(quantityRaw)
      : NaN;

  if (!cardId || !isUuidString(cardId)) {
    return NextResponse.json({ error: "cardId must be a valid UUID" }, { status: 400 });
  }
  if (!Number.isFinite(quantity)) {
    return NextResponse.json({ error: "quantity must be a number" }, { status: 400 });
  }

  try {
    if (quantity > 0) {
      await setWantListEntry(supabase, user.id, cardId, quantity);
      return NextResponse.json({ ok: true, cardId, quantity });
    }
    await removeWantListEntry(supabase, user.id, cardId);
    return NextResponse.json({ ok: true, cardId, removed: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update wantlist";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export const PATCH = defineRouteSimple("PATCH /api/wantlist/update", PATCH_handler);
