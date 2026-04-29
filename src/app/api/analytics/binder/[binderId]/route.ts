import { getBinderAnalytics } from "@/lib/analytics/get-binder-analytics";
import { createClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const params = context.params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const binderId = params.binderId?.trim();
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const analytics = await getBinderAnalytics(supabase, binderId);
  return NextResponse.json(analytics);
}

export const GET = defineRoute(
  "GET /api/analytics/binder/[binderId]",
  GET_handler
);
