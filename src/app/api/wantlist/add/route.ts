import { setWantListEntry } from "@/lib/matching/index-maintenance";
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
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "quantity must be a positive integer" },
      { status: 400 }
    );
  }

  try {
    await setWantListEntry(supabase, user.id, cardId, quantity);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update wantlist";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, cardId, quantity });
}

export const POST = defineRouteSimple("POST /api/wantlist/add", POST_handler);
