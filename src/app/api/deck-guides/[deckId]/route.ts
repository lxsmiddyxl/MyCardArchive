import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function PATCH_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const deckId = context.params.deckId;
  if (!deckId) {
    return NextResponse.json({ error: "Missing deck id" }, { status: 400 });
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
    highlights?: unknown;
    premium_sections?: unknown;
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
  if (Array.isArray(body.highlights)) {
    patch.highlights = body.highlights;
  }
  if (Array.isArray(body.premium_sections)) {
    patch.premium_sections = body.premium_sections;
  }

  const { data, error } = await supabase
    .from("deck_guides")
    .update(patch)
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  return NextResponse.json({ guide: data });
}

export const PATCH = defineRoute("PATCH /api/deck-guides/[deckId]", PATCH_handler);
