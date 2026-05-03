import { presenceSnapshotFromFlair } from "@/lib/presence/flair-presence-fields";
import { loadTopScanMilestonesByUserIds } from "@/lib/badges/load-top-scan-milestones";
import { loadSocialCollectionMasteryByUserIds } from "@/lib/collection/load-collection-mastery-batch";
import { sharedClubsLabel } from "@/lib/clubs/club-catalog";
import { enrichUsersWithFlair } from "@/lib/flair/enrich-user-flair-batch";
import { loadSocialJourneyProgressByUserIds } from "@/lib/journeys/load-journey-batch";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { sharedTraitsTooltip } from "@/lib/social-graph/similarity-weights";
import { traitOverlapInputFromFlairSources } from "@/lib/social-graph/trait-overlap-input";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = {
  componentName: "api/social/recommended-collectors",
  surfaceName: "social.profile",
} as const;

export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit")) || 12));

  const { data: simRows, error: simErr } = await supabase.rpc("get_users_similarity_batch", {
    p_user_ids: [user.id],
  });

  if (simErr) {
    return NextResponse.json({ error: simErr.message }, { status: 500 });
  }

  const row = simRows?.[0];
  const rawIds = row?.similar_user_ids ?? [];
  const rawScores = row?.similarity_scores ?? [];
  if (rawIds.length === 0) {
    mcaLog.event("social.similarity.recommended_empty", { viewerId: user.id }, CTX);
    return NextResponse.json({ collectors: [] });
  }

  const pairs: { id: string; similarityScore: number }[] = [];
  for (let i = 0; i < rawIds.length && pairs.length < limit; i++) {
    const id = rawIds[i]?.trim();
    if (!id || id === user.id) continue;
    const sc = rawScores[i];
    const similarityScore = typeof sc === "number" && Number.isFinite(sc) ? Math.round(sc) : 0;
    pairs.push({ id, similarityScore });
  }

  if (pairs.length === 0) {
    return NextResponse.json({ collectors: [] });
  }

  const targetIds = pairs.map((p) => p.id);
  const allFlairIds = [user.id, ...targetIds];

  const { data: tierRows } = await supabase
    .from("social_public_profiles")
    .select("user_id, tier_slug")
    .in("user_id", allFlairIds);

  const tierBy: Record<string, string | null> = {};
  for (const id of allFlairIds) tierBy[id] = null;
  for (const t of tierRows ?? []) {
    tierBy[t.user_id] = t.tier_slug ?? null;
  }

  const [flairBy, journeyBy, masteryBy, milestones, viewerClubsRes] = await Promise.all([
    enrichUsersWithFlair(supabase, allFlairIds, tierBy),
    loadSocialJourneyProgressByUserIds(supabase, allFlairIds),
    loadSocialCollectionMasteryByUserIds(supabase, allFlairIds),
    loadTopScanMilestonesByUserIds(supabase, targetIds),
    supabase.rpc("get_user_clubs", { p_user_id: user.id }),
  ]);

  const viewerClubIds = (Array.isArray(viewerClubsRes.data) ? viewerClubsRes.data : [])
    .map((r) => (r as { club_id?: string }).club_id)
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());

  const { data: profs } = await supabase
    .from("social_public_profiles")
    .select("user_id, username, avatar_url, tier_slug")
    .in("user_id", targetIds);

  const profBy = new Map((profs ?? []).map((p) => [p.user_id, p]));

  const viewerFlair = flairBy[user.id];
  const viewerTraits =
    viewerFlair &&
    traitOverlapInputFromFlairSources(
      viewerFlair,
      journeyBy[user.id] ?? [],
      masteryBy[user.id] ?? []
    );

  const collectors = pairs.map(({ id, similarityScore }) => {
    const fx = flairBy[id];
    const otherClubIds = (fx?.clubs ?? []).map((c) => c.clubId);
    const p = profBy.get(id);
    const otherTraits =
      fx &&
      traitOverlapInputFromFlairSources(fx, journeyBy[id] ?? [], masteryBy[id] ?? []);
    const traitsTooltip =
      viewerTraits && otherTraits ? sharedTraitsTooltip(viewerTraits, otherTraits) : null;

    return {
      userId: id,
      similarityScore,
      traitsTooltip,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      tierSlug: p?.tier_slug ?? null,
      topScanMilestone: milestones[id] ?? null,
      personaText: fx?.personaText ?? null,
      personaV2Label: fx?.personaV2Label ?? null,
      personaV2Summary: fx?.personaV2Summary ?? null,
      identityHeadline: fx?.identityHeadline ?? null,
      identitySummary: fx?.identitySummary ?? null,
      topFlairKey: fx?.topFlairKey ?? null,
      topSeasonalFlairKey: fx?.topSeasonalFlairKey ?? null,
      topSeasonalBadgeKey: fx?.topSeasonalBadgeKey ?? null,
      topJourneyBadgeKey: fx?.topJourneyBadgeKey ?? null,
      topCollectionMasteryBadgeKey: fx?.topCollectionMasteryBadgeKey ?? null,
      topTradeBadgeKey: fx?.topTradeBadgeKey ?? null,
      topPlayBadgeKey: fx?.topPlayBadgeKey ?? null,
      secondaryPlayFlairKey: fx?.secondaryPlayFlairKey ?? null,
      topValueBadgeKey: fx?.topValueBadgeKey ?? null,
      topFandomBadgeKey: fx?.topFandomBadgeKey ?? null,
      journeyProgressSummary: fx?.journeyProgressSummary ?? null,
      collectionMasterySummary: fx?.collectionMasterySummary ?? null,
      tradeReputationScoreSummary: fx?.tradeReputationScoreSummary ?? null,
      valueIdentitySummary: fx?.valueIdentitySummary ?? null,
      rarityProfileLabel: fx?.rarityProfileLabel ?? null,
      grailHighlightSummary: fx?.grailHighlightSummary ?? null,
      fandomSummary: fx?.fandomSummary ?? null,
      presence: presenceSnapshotFromFlair(fx),
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
    "social.similarity.recommended_view",
    { viewerId: user.id, count: collectors.length },
    CTX
  );
  return NextResponse.json({ collectors });
}

export const GET = defineRouteSimple("GET /api/social/recommended-collectors", GET_handler);
