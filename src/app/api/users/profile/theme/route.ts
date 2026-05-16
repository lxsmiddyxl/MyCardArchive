import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { parseProfileTheme, PROFILE_THEMES } from "@/lib/binders/portfolio-types";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { theme?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const theme = parseProfileTheme(body.theme);
  if (!PROFILE_THEMES.includes(theme)) {
    return errorJson(ctx, "Invalid theme", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ profile_theme: theme })
    .eq("id", session.userId);

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { profile_theme: theme });
}

export const POST = defineRouteSimple("POST /api/users/profile/theme", POST_handler);
