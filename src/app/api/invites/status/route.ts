import { errorJson, successJson, withContextId } from "@/lib/api/route-helpers";
import { normalizeInviteCode } from "@/lib/invites/invite-config";
import { getInviteStatus } from "@/lib/invites/invite-service";
import { defineRouteSimple } from "@/lib/server/api-route";

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const code = normalizeInviteCode(
    new URL(request.url).searchParams.get("code") ?? ""
  );
  if (!code) {
    return errorJson(ctx, "Missing code query parameter.", 400);
  }

  const status = await getInviteStatus(code);
  return successJson(ctx, status);
}

export const GET = defineRouteSimple("GET /api/invites/status", GET_handler);
