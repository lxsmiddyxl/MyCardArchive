import { ensureProfileAndPublic } from "@/lib/supabase/ensureProfile";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

/**
 * Dev-only: force profile + social_public_profiles repair for the current session.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfileAndPublic(supabase, user);
  return NextResponse.json({ ok: true });
}
