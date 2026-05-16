import { errorJson, withContextId } from "@/lib/api/route-helpers";
import { mapShowcaseVersionRow } from "@/lib/showcases/showcase-long-form";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const id = context.params.id?.trim();
  if (!id || !isUuidString(id)) return errorJson(ctx, "Invalid showcase id", 400);

  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("showcase_version_snapshots")
    .select("id, seq, title, description, long_form_body, created_at")
    .eq("showcase_id", id)
    .order("seq", { ascending: false })
    .limit(20);

  if (error) return errorJson(ctx, error.message, 500);

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    versions: (rows ?? []).map(mapShowcaseVersionRow),
  });
}

export const GET = defineRoute("GET /api/showcases/[id]/versions", GET_handler);
