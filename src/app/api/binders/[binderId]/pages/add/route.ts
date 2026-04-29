import { BINDER_SLOTS_PER_PAGE } from "@/lib/binders/constants";
import { getMaxBinderPagesForUser } from "@/lib/binders/page-limits";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(
  _request: Request,
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

    const binderId = context.params.binderId?.trim();
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

    const maxPages = await getMaxBinderPagesForUser(supabase);

    const { data: maxRow } = await supabase
      .from("binder_slots")
      .select("page_number")
      .eq("binder_id", binderId)
      .order("page_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentMax =
      typeof maxRow?.page_number === "number" ? maxRow.page_number : -1;
    const newPage = currentMax + 1;

    if (newPage >= maxPages) {
      return NextResponse.json(
        {
          error: `Page limit reached (${maxPages} pages for your plan).`,
        },
        { status: 403 }
      );
    }

    const rows = Array.from({ length: BINDER_SLOTS_PER_PAGE }, (_, slot_index) => ({
      binder_id: binderId,
      page_number: newPage,
      slot_index,
      card_id: null as string | null,
    }));

    const { error: upErr } = await supabase.from("binder_slots").upsert(rows, {
      onConflict: "binder_id,page_number,slot_index",
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, page_number: newPage });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/pages/add",
  POST_handler
);
