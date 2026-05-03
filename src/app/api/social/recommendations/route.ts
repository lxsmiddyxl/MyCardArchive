import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import { sharedClubsLabel } from "@/lib/clubs/club-catalog";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/recommendations", surfaceName: "social.profile" } as const;

export const dynamic = "force-dynamic";

type RecRow = { user_id: string; score: number; reasons: unknown };

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 12));

  const { data: raw, error } = await supabase.rpc("get_social_recommendations", {
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = [];
    }
  }
  const rows = Array.isArray(parsed) ? (parsed as RecRow[]) : [];

  const ids = rows.map((r) => r.user_id).filter(Boolean);
  let profiles: {
    user_id: string;
    username: string | null;
    avatar_url: string | null;
    tier_slug: string | null;
  }[] = [];
  if (ids.length > 0) {
    const { data: profs, error: pErr } = await supabase
      .from("social_public_profiles")
      .select("user_id, username, avatar_url, tier_slug")
      .in("user_id", ids);
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    profiles = profs ?? [];
  }

  const profById = new Map(profiles.map((p) => [p.user_id, p]));
  const milestones = ids.length > 0 ? await loadTopScanMilestonesByUserIds(supabase, ids) : {};
  const tierBy: Record<string, string | null> = {};
  for (const id of ids) {
    tierBy[id] = profById.get(id)?.tier_slug ?? null;
  }
  const flairBy = ids.length > 0 ? await enrichUsersWithFlair(supabase, ids, tierBy) : {};

  const { data: viewerClubRows } = await supabase.rpc("get_user_clubs", { p_user_id: user.id });
  const viewerClubIds = (Array.isArray(viewerClubRows) ? viewerClubRows : [])
    .map((r) => (r as { club_id?: string }).club_id)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());

  const { data: stripRows } =
    ids.length > 0
      ? await supabase.rpc("get_users_activity_recent_days_batch", {
          p_user_ids: ids,
          p_days: 30,
        })
      : { data: null as unknown };
  const stripBy = new Map<string, number[]>();
  const stripList = Array.isArray(stripRows) ? stripRows : [];
  for (const sr of stripList) {
    const row = sr as { user_id?: string; counts?: unknown };
    if (!row.user_id || !Array.isArray(row.counts)) continue;
    stripBy.set(
      row.user_id,
      row.counts.map((n) => (typeof n === "number" ? n : Number(n)))
    );
  }

  const recommendations = rows.map((r) => {
    const p = profById.get(r.user_id);
    const fx = flairBy[r.user_id];
    const otherClubIds = (fx?.clubs ?? []).map((c) => c.clubId);
    return {
      userId: r.user_id,
      score: r.score,
      reasons: Array.isArray(r.reasons) ? r.reasons : [],
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      tierSlug: p?.tier_slug ?? null,
      topScanMilestone: milestones[r.user_id] ?? null,
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
      personaV2Label: fx?.personaV2Label ?? null,
      personaV2Summary: fx?.personaV2Summary ?? null,
      identityHeadline: fx?.identityHeadline ?? null,
      identitySummary: fx?.identitySummary ?? null,
      presence: presenceSnapshotFromFlair(fx),
      activityHeatmapStrip: stripBy.get(r.user_id),
      seasonHighlight: fx?.seasonHighlight ?? null,
      clubs: fx?.clubs ?? [],
      primaryClubId: fx?.primaryClubId ?? null,
      sharedClubsSummary: sharedClubsLabel(viewerClubIds, otherClubIds),
      reputationSummary: fx?.reputationSummary ?? null,
      influenceSummary: fx?.influenceSummary ?? null,
      badgeHighlight: fx?.badgeHighlight ?? null,
      presenceLabel: fx?.presenceLabel ?? null,
    };
  });

  mcaLog.event(
    "social.recommendation.view",
    { viewerId: user.id, count: recommendations.length },
    CTX
  );
  return NextResponse.json({ recommendations });
}

export const GET = defineRouteSimple("GET /api/social/recommendations", GET_handler);
