import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { isAdminEmail } from "@/lib/invites/invite-config";
import { inviteCodesToCsv } from "@/lib/invites/invite-config";
import { getInviteUsageStats } from "@/lib/invites/invite-service";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [internal, admin] = await Promise.all([
    isCurrentUserInternalUnlimited(supabase),
    Promise.resolve(isAdminEmail(user?.email)),
  ]);
  if (!internal && !admin) {
    return errorJson(ctx, "Not authorized.", 403);
  }

  const stats = await getInviteUsageStats(session.userId);
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") {
    const csv = inviteCodesToCsv(stats.recent);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="invite-codes.csv"',
      },
    });
  }

  return successJson(ctx, stats);
}

export const GET = defineRouteSimple("GET /api/invites/usage", GET_handler);
