import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler() {
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
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ showcases: data ?? [] });
}

async function POST_handler(request: Request) {
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

  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const binder_ids = Array.isArray(body.binder_ids) ? body.binder_ids : [];
  const featured_card_ids = Array.isArray(body.featured_card_ids) ? body.featured_card_ids : [];
  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;

  const { data, error } = await supabase
    .from("collection_showcases")
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      description,
      binder_ids,
      featured_card_ids,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ showcase: data });
}

export const GET = defineRouteSimple("GET /api/showcases", GET_handler);
export const POST = defineRouteSimple("POST /api/showcases", POST_handler);
