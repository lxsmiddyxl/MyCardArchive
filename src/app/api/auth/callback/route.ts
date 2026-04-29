import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/route";
import { defineRouteSimple } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/**
 * OAuth callback — must always redirect (never JSON 500) for provider UX.
 * Errors are handled via redirect to /auth/sign-in?error=auth
 */
async function GET_handler(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  try {
    if (code) {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const dest = new URL(next, origin);
        if (dest.pathname === "/auth/sign-in" || dest.pathname === "/login") {
          dest.searchParams.set("verified", "1");
        }
        return NextResponse.redirect(dest.toString());
      }
    }
  } catch {
    // fall through to error redirect
  }

  return NextResponse.redirect(
    `${origin}/auth/sign-in?error=auth&next=${encodeURIComponent(next)}`
  );
}

export const GET = defineRouteSimple("GET /api/auth/callback", GET_handler);
