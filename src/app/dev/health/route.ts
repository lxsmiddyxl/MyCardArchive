import { hasServiceRoleKey } from "@/lib/server/env-guards";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const envPresence = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    ),
    SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey(),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
  };

  let supabaseReachable = false;
  let authUserId: string | null = null;
  try {
    getSupabasePublicEnv();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authUserId = user?.id ?? null;
    supabaseReachable = true;
  } catch {
    supabaseReachable = false;
  }

  const version =
    process.env.npm_package_version?.trim() ||
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    "0.1.0";

  return NextResponse.json({
    ok:
      supabaseReachable &&
      envPresence.NEXT_PUBLIC_SUPABASE_URL &&
      envPresence.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    timestamp: new Date().toISOString(),
    version,
    env: envPresence,
    auth: { userId: authUserId },
    supabaseReachable,
  });
}
