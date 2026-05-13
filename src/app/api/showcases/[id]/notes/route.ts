import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { moderationTokensViolated } from "@/lib/community/content-guard";
import type { ShowcaseNoteV1DTO } from "@/lib/dto/showcase-creator";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { sanitizePlainTextUserInput } from "@/lib/server/sanitize-user-text";
import { formatShowcaseNoteBody, isShowcaseNotePost, parseShowcaseNoteBody } from "@/lib/showcases/showcase-notes";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

const MAX_NOTE = 600;

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const id = context.params.id?.trim() ?? "";
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  if (!isUuidString(id)) {
    return errorJson(ctx, "Invalid showcase id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data: showcase, error: sErr } = await supabase
    .from("collection_showcases")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (sErr) {
    return errorJson(ctx, safePublicDbMessage(sErr.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  if (!showcase) {
    return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const prefix = `[[mca:showcase-note:${id}]]`;
  const { data: posts, error } = await supabase
    .from("community_posts")
    .select("id, author_id, body, created_at")
    .like("body", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  const notes: ShowcaseNoteV1DTO[] = (posts ?? [])
    .filter((p) => isShowcaseNotePost(id, p.body))
    .map((p) => {
      const text = parseShowcaseNoteBody(id, p.body) ?? "";
      return { id: p.id, author_id: p.author_id, text, created_at: p.created_at };
    });

  return successJson(ctx, { notes });
}

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const id = context.params.id?.trim() ?? "";
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  if (!isUuidString(id)) {
    return errorJson(ctx, "Invalid showcase id", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data: showcase, error: sErr } = await supabase
    .from("collection_showcases")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (sErr) {
    return errorJson(ctx, safePublicDbMessage(sErr.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  if (!showcase || showcase.user_id !== session.userId) {
    return errorJson(ctx, "Not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  let body: { text?: string } = {};
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }
  const raw = typeof body.text === "string" ? body.text : "";
  const text = sanitizePlainTextUserInput(raw, MAX_NOTE);
  if (!text) {
    return errorJson(ctx, "text required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }
  if (moderationTokensViolated(text)) {
    return errorJson(ctx, "This content cannot be posted.", 422, { code: ApiErrorCode.BAD_REQUEST });
  }

  const fullBody = formatShowcaseNoteBody(id, text);
  const { data, error } = await supabase
    .from("community_posts")
    .insert({ author_id: session.userId, body: fullBody })
    .select("id, author_id, body, created_at")
    .single();

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  const note: ShowcaseNoteV1DTO = {
    id: data.id,
    author_id: data.author_id,
    text: parseShowcaseNoteBody(id, data.body) ?? text,
    created_at: data.created_at,
  };
  return successJson(ctx, { note });
}

export const GET = defineRoute("GET /api/showcases/[id]/notes", GET_handler);
export const POST = defineRoute("POST /api/showcases/[id]/notes", POST_handler);
