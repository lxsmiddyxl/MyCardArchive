import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SlotRef = { page: number; slot: number };

function normalizeSlotRef(raw: unknown): SlotRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const page =
    typeof o.page === "number" && Number.isFinite(o.page)
      ? Math.max(0, Math.floor(o.page))
      : NaN;
  const slot =
    typeof o.slot === "number" && Number.isFinite(o.slot)
      ? Math.floor(o.slot)
      : NaN;
  if (!Number.isFinite(page) || !Number.isFinite(slot)) return null;
  if (slot < 0 || slot > 23) return null;
  return { page, slot };
}

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const binderId = context.params["binderId"]?.trim();
    if (!binderId) {
      return NextResponse.json({ error: "Invalid binder id" }, { status: 400 });
    }

    const { data: binder, error: bErr } = await supabase
      .from("binders")
      .select("id")
      .eq("id", binderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }
    if (!binder) {
      return NextResponse.json({ error: "Binder not found" }, { status: 404 });
    }

    let body: { from?: unknown; to?: unknown };
    try {
      body = (await request.json()) as { from?: unknown; to?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const from = normalizeSlotRef(body.from);
    const to = normalizeSlotRef(body.to);
    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to must be { page: number, slot: number }" },
        { status: 400 }
      );
    }

    if (from.page === to.page && from.slot === to.slot) {
      return NextResponse.json({ ok: true, message: "No-op" });
    }

    async function readCardId(page: number, slot: number): Promise<string | null> {
      const { data } = await supabase
        .from("binder_slots")
        .select("card_id")
        .eq("binder_id", binderId)
        .eq("page_number", page)
        .eq("slot_index", slot)
        .maybeSingle();
      return data?.card_id ?? null;
    }

    const fromCard = await readCardId(from.page, from.slot);
    const toCard = await readCardId(to.page, to.slot);

    const { error: upErr } = await supabase.from("binder_slots").upsert(
      [
        {
          binder_id: binderId,
          page_number: from.page,
          slot_index: from.slot,
          card_id: toCard,
        },
        {
          binder_id: binderId,
          page_number: to.page,
          slot_index: to.slot,
          card_id: fromCard,
        },
      ],
      { onConflict: "binder_id,page_number,slot_index" }
    );

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/slots/move",
  POST_handler
);
