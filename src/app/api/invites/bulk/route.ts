import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { isAdminEmail } from "@/lib/invites/invite-config";
import { createInviteCodesBulk } from "@/lib/invites/invite-service";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";

type BulkBody = { count?: number };

async function POST_handler(request: Request) {
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

  let body: BulkBody;
  try {
    body = (await request.json()) as BulkBody;
  } catch {
    return errorJson(ctx, "Invalid body.", 400);
  }

  const count = Math.min(100, Math.max(1, Math.floor(body.count ?? 10)));
  const rows = await createInviteCodesBulk(session.userId, count);
  if (!rows.length) {
    return errorJson(ctx, "Could not generate invite codes.", 500);
  }

  return successJson(ctx, {
    count: rows.length,
    codes: rows.map((r) => ({ code: r.code, id: r.id, created_at: r.created_at })),
  });
}

export const POST = defineRouteSimple("POST /api/invites/bulk", POST_handler);
