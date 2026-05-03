import { getClubById, pickPrimaryClubId, sharedClubsLabel } from "@/lib/clubs/club-catalog";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { parseFiltersFromQuery } from "@/lib/search/search-filters";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import type { Database } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RpcRow = {
  user_id: string;
  rank_score: number;
  similarity_score: number | null;
  persona_text: string | null;
  display_name: string | null;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  presence_state: string | null;
  active_within_days: number | null;
  primary_club_id: string | null;
  club_ids: string[];
  events_last_7d: number;
  events_last_30d: number;
  play_format_id: string | null;
  play_archetype_id: string | null;
  fandom_era_id: string | null;
  value_band: number;
  trade_tier: number;
};

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    void supabase.rpc("refresh_user_presence", {
      p_user_id: user.id,
      p_state: "online",
      p_device: "web",
    });
  }

  const url = new URL(request.url);
  const filtersRaw = url.searchParams.get("filters");
  const filters = parseFiltersFromQuery(filtersRaw);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { data: rows, error } = await supabase.rpc("search_collectors", {
    p_filters: filters as unknown as Database["public"]["Functions"]["search_collectors"]["Args"]["p_filters"],
    p_limit: limit,
    p_offset: offset,
    p_viewer_id: user?.id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (Array.isArray(rows) ? rows : []) as RpcRow[];
  const ids = list.map((r) => r.user_id).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ results: [], limit, offset });
  }

  const { data: tiers } = await supabase
    .from("social_public_profiles")
    .select("user_id, tier_slug")
    .in("user_id", ids);
  const tierBy: Record<string, string | null> = {};
  for (const id of ids) tierBy[id] = null;
  for (const t of tiers ?? []) tierBy[t.user_id] = t.tier_slug ?? null;

  const flairBy = await enrichUsersWithFlair(supabase, ids, tierBy);

  const { data: stripRows } = await supabase.rpc("get_users_activity_recent_days_batch", {
    p_user_ids: ids,
    p_days: 30,
  });
  const stripBy = new Map<string, number[]>();
  for (const sr of stripRows ?? []) {
    const r = sr as { user_id?: string; counts?: unknown };
    if (!r.user_id || !Array.isArray(r.counts)) continue;
    stripBy.set(
      r.user_id,
      r.counts.map((n) => (typeof n === "number" ? n : Number(n)))
    );
  }

  let viewerClubIds: string[] = [];
  if (user?.id) {
    const { data: vc } = await supabase.rpc("get_user_clubs", { p_user_id: user.id });
    viewerClubIds = (Array.isArray(vc) ? vc : [])
      .map((x) => (x as { club_id?: string }).club_id)
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
  }

  const results = list.map((row) => {
    const fx = flairBy[row.user_id];
    const clubs = row.club_ids ?? [];
    const pid = row.primary_club_id?.trim() || pickPrimaryClubId(clubs);
    const primary = pid ? getClubById(pid)?.displayName ?? pid : null;
    return {
      userId: row.user_id,
      rankScore: row.rank_score,
      similarityScore: row.similarity_score,
      personaText: row.persona_text ?? fx?.personaText ?? null,
      displayName: row.display_name?.trim() || null,
      username: row.username ?? null,
      handle: row.handle ?? null,
      avatarUrl: row.avatar_url ?? null,
      presence: presenceSnapshotFromFlair(fx),
      primaryClubId: row.primary_club_id ?? null,
      primaryClubLabel: primary,
      clubIds: clubs,
      sharedClubsSummary:
        user?.id && viewerClubIds.length > 0 ? sharedClubsLabel(viewerClubIds, clubs) : null,
      eventsLast7d: row.events_last_7d,
      eventsLast30d: row.events_last_30d,
      activityHeatmapStrip: stripBy.get(row.user_id),
      topFlairKey: fx?.topFlairKey ?? null,
      topSeasonalFlairKey: fx?.topSeasonalFlairKey ?? null,
      topPlayBadgeKey: fx?.topPlayBadgeKey ?? null,
      topFandomBadgeKey: fx?.topFandomBadgeKey ?? null,
      fandomSummary: fx?.fandomSummary ?? null,
      reputationSummary: fx?.reputationSummary ?? null,
      reputationDimensionChips: fx?.reputationDimensionChips ?? [],
      influenceSummary: fx?.influenceSummary ?? null,
      badgeHighlight: fx?.badgeHighlight ?? null,
      presenceLabel: fx?.presenceLabel ?? null,
      personaV2Label: fx?.personaV2Label ?? null,
      personaV2Summary: fx?.personaV2Summary ?? null,
      identityHeadline: fx?.identityHeadline ?? null,
      identitySummary: fx?.identitySummary ?? null,
      influenceDimensionChips: fx?.influenceDimensionChips ?? [],
      indexedPresenceState: row.presence_state ?? null,
      activeWithinDays: row.active_within_days,
      valueBand: row.value_band,
      tradeTier: row.trade_tier,
      playFormatId: row.play_format_id ?? null,
      playArchetypeId: row.play_archetype_id ?? null,
      fandomEraId: row.fandom_era_id ?? null,
    };
  });

  return NextResponse.json({ results, limit, offset });
}

export const GET = defineRouteSimple("GET /api/search/collectors", GET_handler);
