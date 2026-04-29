import type { CollectionMasteryDbRow } from "@/lib/collection/collection-mastery-merge";
import type { UserFlairEnrichment } from "@/lib/flair/enrich-user-flair-batch";
import type { JourneyProgressDbRow } from "@/lib/journeys/journey-catalog";
import type { TraitOverlapInput } from "@/lib/social-graph/similarity-weights";

/** Builds overlap inputs for “You share X/Y identity traits.” — server-side only. */
export function traitOverlapInputFromFlairSources(
  flair: UserFlairEnrichment,
  journeyRows: JourneyProgressDbRow[],
  masteryRows: CollectionMasteryDbRow[]
): TraitOverlapInput {
  return {
    favoriteFormatId: flair.favoriteFormatId,
    favoriteArchetypeId: flair.favoriteArchetypeId,
    favoriteEraId: flair.favoriteEraId,
    favoriteSetId: flair.favoriteSetId,
    favoriteArtistId: flair.favoriteArtistId,
    favoriteCharacterId: flair.favoriteCharacterId,
    favoriteThemeId: flair.favoriteThemeId,
    topValueBadgeKey: flair.topValueBadgeKey,
    topTradeBadgeKey: flair.topTradeBadgeKey,
    seasonalBadgeKeys: flair.seasonalBadgeKeys ?? [],
    journeyCompleteIds: journeyRows.filter((r) => r.is_complete).map((r) => r.journey_id),
    masteryCompleteKeys: masteryRows
      .filter((r) => r.is_complete)
      .map((r) => `${r.mastery_type}:${r.mastery_key}`),
  };
}
