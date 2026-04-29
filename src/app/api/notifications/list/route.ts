import {
  cacheKeyNotificationsList,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlNotificationsMs,
} from "@/lib/cache";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import { getUserNotifications } from "@/lib/notifications/db";
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

  const hpToken = markHotPathStart("hp:notifications:list");
  try {
    const cacheKey = cacheKeyNotificationsList(user.id);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const rows = await getUserNotifications(supabase, user.id);
    const unreadCount = rows.filter((n) => n.read_at == null).length;

    const notifications = rows.map((n) => ({
      id: n.id,
      user_id: n.user_id,
      type: n.type,
      kind: n.type,
      title: n.title,
      body: n.body,
      trade_id: n.trade_id ?? "",
      read_at: n.read_at,
      created_at: n.created_at,
    }));

    const body = { notifications, unreadCount };
    if (isCacheEnabled()) {
      setCache(cacheKey, body, effectiveTtl(ttlNotificationsMs()));
    }
    return NextResponse.json(body);
  } finally {
    markHotPathEnd(hpToken);
  }
}

export const GET = defineRouteSimple("GET /api/notifications/list", GET_handler);
