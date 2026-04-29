import { BINDER_PAGE_SWAP_TEMP } from "@/lib/binders/constants";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    let body: { page_a?: number; page_b?: number };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const a =
      typeof body.page_a === "number" && Number.isFinite(body.page_a)
        ? Math.max(0, Math.floor(body.page_a))
        : NaN;
    const b =
      typeof body.page_b === "number" && Number.isFinite(body.page_b)
        ? Math.max(0, Math.floor(body.page_b))
        : NaN;

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return NextResponse.json(
        { error: "page_a and page_b must be non-negative integers" },
        { status: 400 }
      );
    }

    if (a === b) {
      return NextResponse.json({ ok: true, message: "No-op" });
    }

    const { data: maxRow } = await supabase
      .from("binder_slots")
      .select("page_number")
      .eq("binder_id", binderId)
      .order("page_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxSeen =
      typeof maxRow?.page_number === "number" ? maxRow.page_number : 0;

    if (a > maxSeen && b > maxSeen) {
      return NextResponse.json({ error: "Nothing to reorder" }, { status: 400 });
    }

    if (a >= BINDER_PAGE_SWAP_TEMP - 2 || b >= BINDER_PAGE_SWAP_TEMP - 2) {
      return NextResponse.json({ error: "Invalid page index" }, { status: 400 });
    }

    const temp = BINDER_PAGE_SWAP_TEMP;

    const { error: e1 } = await supabase
      .from("binder_slots")
      .update({ page_number: temp })
      .eq("binder_id", binderId)
      .eq("page_number", a);

    if (e1) {
      return NextResponse.json({ error: e1.message }, { status: 500 });
    }

    const { error: e2 } = await supabase
      .from("binder_slots")
      .update({ page_number: a })
      .eq("binder_id", binderId)
      .eq("page_number", b);

    if (e2) {
      await supabase
        .from("binder_slots")
        .update({ page_number: a })
        .eq("binder_id", binderId)
        .eq("page_number", temp);
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }

    const { error: e3 } = await supabase
      .from("binder_slots")
      .update({ page_number: b })
      .eq("binder_id", binderId)
      .eq("page_number", temp);

    if (e3) {
      return NextResponse.json({ error: e3.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/pages/reorder",
  POST_handler
);
