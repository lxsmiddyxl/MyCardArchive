import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import {
  cacheKeyBindersList,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlCollectionMs,
} from "@/lib/cache";
import type { BinderSummaryDTO } from "@/lib/dto/catalog";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import {
  defineRouteNoArgs,
  defineRouteSimple,
} from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanCreateBinder,
  isTierLimitError,
} from "@/lib/tier/check-limits";
import { NextResponse } from "next/server";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  // validateSession() sets userId from supabase.auth.getUser().user.id (auth.users.id).
  // GET .eq("user_id", session.userId) matches RLS using (auth.uid() = user_id).


  const hpToken = markHotPathStart("hp:collection:listViewport");
  try {
    const cacheKey = cacheKeyBindersList(session.userId);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, context_id: ctx.contextId, ...cached });
      }
    }

    const { data, error } = await supabase
      .from("binders")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return errorJson(ctx, error.message, 500, {
        hint: "Ensure binders table and RLS exist.",
      });
    }

    const body = { binders: data ?? [] };
    if (isCacheEnabled()) {
      setCache(cacheKey, body, effectiveTtl(ttlCollectionMs()));
    }
    return NextResponse.json({
      success: true,
      context_id: ctx.contextId,
      binders: body.binders as BinderSummaryDTO[],
    });
  } finally {
    markHotPathEnd(hpToken);
  }
}

export const GET = defineRouteNoArgs("GET /api/binders", GET_handler);

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  // insert.user_id: session.userId — satisfies with check (auth.uid() = user_id).

  let body: { name?: string; description?: string | null };
  try {
    body = await request.json();
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return errorJson(ctx, "name is required", 400);
  }

  try {
    await assertCanCreateBinder(supabase);
  } catch (e) {
    if (isTierLimitError(e)) {
      return errorJson(ctx, e.message, 403);
    }
    throw e;
  }

  const description =
    typeof body.description === "string"
      ? body.description.trim() || null
      : body.description === null
        ? null
        : undefined;

  const insert: {
    user_id: string;
    name: string;
    description?: string | null;
  } = { user_id: session.userId, name };

  if (description !== undefined) {
    insert.description = description;
  }

  const { data, error } = await supabase
    .from("binders")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  return NextResponse.json({ success: true, context_id: ctx.contextId, binder: data as BinderSummaryDTO });
}

export const POST = defineRouteSimple("POST /api/binders", POST_handler);
