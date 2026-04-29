import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const id = context.params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("collection_showcases")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ showcase: data });
}

async function PATCH_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const id = context.params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    binder_ids?: string[];
    featured_card_ids?: string[];
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (body.description === null || typeof body.description === "string") {
    patch.description =
      body.description === null || body.description.trim() === ""
        ? null
        : body.description.trim();
  }
  if (Array.isArray(body.binder_ids)) patch.binder_ids = body.binder_ids;
  if (Array.isArray(body.featured_card_ids)) patch.featured_card_ids = body.featured_card_ids;

  const { data, error } = await supabase
    .from("collection_showcases")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ showcase: data });
}

export const GET = defineRoute("GET /api/showcases/[id]", GET_handler);
export const PATCH = defineRoute("PATCH /api/showcases/[id]", PATCH_handler);
