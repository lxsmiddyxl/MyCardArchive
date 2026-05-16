import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { isAdminEmail } from "@/lib/invites/invite-config";
import { createInviteCode } from "@/lib/invites/invite-service";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";

async function POST_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  const [internal, admin] = await Promise.all([
    isCurrentUserInternalUnlimited(supabase),
    Promise.resolve(isAdminEmail(email)),
  ]);

  if (!internal && !admin) {
    return errorJson(ctx, "Not authorized to create invite codes.", 403);
  }

  const row = await createInviteCode(session.userId);
  if (!row) {
    return errorJson(ctx, "Could not create invite code.", 500);
  }

  return successJson(ctx, { code: row.code, id: row.id, created_at: row.created_at });
}

export const POST = defineRouteSimple("POST /api/invites/create", POST_handler);
