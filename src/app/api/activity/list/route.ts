import {
  cacheKeyActivityList,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlActivityMs,
} from "@/lib/cache";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import { getUserActivity } from "@/lib/notifications/db";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hpToken = markHotPathStart("hp:activity:feed");
  try {
    const cacheKey = cacheKeyActivityList(user.id);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const activity = await getUserActivity(supabase, user.id);
    const body = { activity };
    if (isCacheEnabled()) {
      setCache(cacheKey, body, effectiveTtl(ttlActivityMs()));
    }
    return NextResponse.json(body);
  } finally {
    markHotPathEnd(hpToken);
  }
}

export const GET = defineRouteSimple("GET /api/activity/list", GET_handler);
