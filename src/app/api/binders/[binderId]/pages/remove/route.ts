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

    let body: { page_number?: number };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const pageNumber =
      typeof body.page_number === "number" && Number.isFinite(body.page_number)
        ? Math.max(0, Math.floor(body.page_number))
        : NaN;

    if (!Number.isFinite(pageNumber)) {
      return NextResponse.json({ error: "page_number required" }, { status: 400 });
    }

    const { data: distinct } = await supabase
      .from("binder_slots")
      .select("page_number")
      .eq("binder_id", binderId);

    const pageSet = new Set(
      (distinct ?? []).map((r) => r.page_number).filter((n) => typeof n === "number")
    );

    if (!pageSet.has(pageNumber)) {
      return NextResponse.json({ ok: true, message: "Page had no rows" });
    }

    if (pageSet.size <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the only stored page. Clear slots instead." },
        { status: 400 }
      );
    }

    const { error: delErr } = await supabase
      .from("binder_slots")
      .delete()
      .eq("binder_id", binderId)
      .eq("page_number", pageNumber);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const { data: toShift } = await supabase
      .from("binder_slots")
      .select("id, page_number")
      .eq("binder_id", binderId)
      .gt("page_number", pageNumber);

    for (const row of toShift ?? []) {
      const { error: uErr } = await supabase
        .from("binder_slots")
        .update({ page_number: row.page_number - 1 })
        .eq("id", row.id);
      if (uErr) {
        return NextResponse.json({ error: uErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/pages/remove",
  POST_handler
);
