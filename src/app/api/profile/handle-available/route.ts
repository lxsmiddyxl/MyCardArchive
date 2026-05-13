import { sanitizeHandle } from "@/lib/validation/profile";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("handle") ?? "";
  const handle = sanitizeHandle(raw);
  const excludeUserId = url.searchParams.get("exclude_user_id")?.trim();

  if (!handle || handle.length < 3) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  /* Handles are mirrored to social_public_profiles (RLS: any authenticated user may SELECT).
     public.profiles is owner-scoped — querying it cannot detect another user's taken handle. */
  const { data: taken } = await supabase
    .from("social_public_profiles")
    .select("user_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!taken?.user_id) {
    return NextResponse.json({ available: true });
  }
  if (excludeUserId && isUuidString(excludeUserId) && taken.user_id === excludeUserId) {
    return NextResponse.json({ available: true });
  }

  return NextResponse.json({ available: false, reason: "taken" });
}

export const GET = defineRouteSimple("GET /api/profile/handle-available", GET_handler);
