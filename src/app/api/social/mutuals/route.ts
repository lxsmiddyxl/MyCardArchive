import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import { sharedClubsLabel } from "@/lib/clubs/club-catalog";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/mutuals", surfaceName: "social.profile" } as const;

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [lowRows, highRows] = await Promise.all([
    supabase.from("social_mutual_pairs").select("user_low, user_high").eq("user_low", user.id),
    supabase.from("social_mutual_pairs").select("user_low, user_high").eq("user_high", user.id),
  ]);

  const err = lowRows.error ?? highRows.error;
  if (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const pairs = [...(lowRows.data ?? []), ...(highRows.data ?? [])];
  const otherIds = [...new Set(pairs.map((p) => (p.user_low === user.id ? p.user_high : p.user_low)))];

  if (otherIds.length === 0) {
    mcaLog.event("social.mutuals.view", { viewerId: user.id, count: 0 }, CTX);
    return NextResponse.json({ mutuals: [] });
  }

  const { data: profiles, error: pErr } = await supabase
    .from("social_public_profiles")
    .select("user_id, username, avatar_url, tier_slug")
    .in("user_id", otherIds);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const milestones = await loadTopScanMilestonesByUserIds(supabase, otherIds);
  const tierBy: Record<string, string | null> = {};
  for (const row of profiles ?? []) {
    tierBy[row.user_id] = row.tier_slug ?? null;
  }
  const flairBy = await enrichUsersWithFlair(supabase, otherIds, tierBy);

  const { data: viewerClubRows } = await supabase.rpc("get_user_clubs", { p_user_id: user.id });
  const viewerClubIds = (Array.isArray(viewerClubRows) ? viewerClubRows : [])
    .map((r) => (r as { club_id?: string }).club_id)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());

  const { data: stripRows } = await supabase.rpc("get_users_activity_recent_days_batch", {
    p_user_ids: otherIds,
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

  const list = (profiles ?? []).map((row) => {
    const fx = flairBy[row.user_id];
    const otherClubIds = (fx?.clubs ?? []).map((c) => c.clubId);
    return {
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url,
    tierSlug: row.tier_slug,
    topScanMilestone: milestones[row.user_id] ?? null,
    reputationScore: fx?.reputationScore ?? 0,
    activityStreak: fx?.activityStreak ?? 0,
    topFlairKey: fx?.topFlairKey ?? null,
    topSeasonalFlairKey: fx?.topSeasonalFlairKey ?? null,
    topSeasonalBadgeKey: fx?.topSeasonalBadgeKey ?? null,
    seasonalBadgeKeys: fx?.seasonalBadgeKeys ?? [],
    topJourneyBadgeKey: fx?.topJourneyBadgeKey ?? null,
    journeyProgressSummary: fx?.journeyProgressSummary ?? null,
    topCollectionMasteryBadgeKey: fx?.topCollectionMasteryBadgeKey ?? null,
    collectionMasterySummary: fx?.collectionMasterySummary ?? null,
    tradeReputationScoreSummary: fx?.tradeReputationScoreSummary ?? null,
    topTradeBadgeKey: fx?.topTradeBadgeKey ?? null,
    favoriteFormatId: fx?.favoriteFormatId ?? null,
    favoriteArchetypeId: fx?.favoriteArchetypeId ?? null,
    favoriteDeckName: fx?.favoriteDeckName ?? null,
    topPlayBadgeKey: fx?.topPlayBadgeKey ?? null,
    secondaryPlayFlairKey: fx?.secondaryPlayFlairKey ?? null,
    valueIdentitySummary: fx?.valueIdentitySummary ?? null,
    rarityProfileLabel: fx?.rarityProfileLabel ?? null,
    topValueBadgeKey: fx?.topValueBadgeKey ?? null,
    grailHighlightSummary: fx?.grailHighlightSummary ?? null,
    favoriteSetId: fx?.favoriteSetId ?? null,
    favoriteEraId: fx?.favoriteEraId ?? null,
    favoriteArtistId: fx?.favoriteArtistId ?? null,
    favoriteCharacterId: fx?.favoriteCharacterId ?? null,
    favoriteThemeId: fx?.favoriteThemeId ?? null,
    topFandomBadgeKey: fx?.topFandomBadgeKey ?? null,
    fandomSummary: fx?.fandomSummary ?? null,
    personaText: fx?.personaText ?? null,
    presence: presenceSnapshotFromFlair(fx),
    activityHeatmapStrip: stripBy.get(row.user_id),
    seasonHighlight: fx?.seasonHighlight ?? null,
    clubs: fx?.clubs ?? [],
    primaryClubId: fx?.primaryClubId ?? null,
    sharedClubsSummary: sharedClubsLabel(viewerClubIds, otherClubIds),
    reputationSummary: fx?.reputationSummary ?? null,
    influenceSummary: fx?.influenceSummary ?? null,
  };
  });

  mcaLog.event("social.mutuals.view", { viewerId: user.id, count: list.length }, CTX);
  return NextResponse.json({ mutuals: list });
}

export const GET = defineRouteSimple("GET /api/social/mutuals", GET_handler);
