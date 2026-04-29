import {
  cacheKeyBindersList,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlCollectionMs,
} from "@/lib/cache";
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hpToken = markHotPathStart("hp:collection:listViewport");
  try {
    const cacheKey = cacheKeyBindersList(user.id);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const { data, error } = await supabase
      .from("binders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: "Ensure binders table and RLS exist." },
        { status: 500 }
      );
    }

    const body = { binders: data ?? [] };
    if (isCacheEnabled()) {
      setCache(cacheKey, body, effectiveTtl(ttlCollectionMs()));
    }
    return NextResponse.json(body);
  } finally {
    markHotPathEnd(hpToken);
  }
}

export const GET = defineRouteNoArgs("GET /api/binders", GET_handler);

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; description?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    await assertCanCreateBinder(supabase);
  } catch (e) {
    if (isTierLimitError(e)) {
      return NextResponse.json({ success: false, error: e.message }, {
        status: 403,
      });
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
  } = { user_id: user.id, name };

  if (description !== undefined) {
    insert.description = description;
  }

  const { data, error } = await supabase
    .from("binders")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ binder: data });
}

export const POST = defineRouteSimple("POST /api/binders", POST_handler);
