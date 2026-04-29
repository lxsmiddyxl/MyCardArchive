import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { normalizeRarity } from "@/lib/achievements/rarity";

/** progress = current metric count toward this achievement's requirement_type */
export type AchievementListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
  unlocked: boolean;
  unlocked_at: string | null;
  /** Current count (e.g. binders owned) for this achievement's requirement_type */
  progress: number;
};

function metricCount(
  requirementType: string,
  counts: { binder: number; card: number; scan: number }
): number {
  switch (requirementType.toLowerCase()) {
    case "binder_count":
      return counts.binder;
    case "card_count":
      return counts.card;
    case "scan_count":
      return counts.scan;
    default:
      return 0;
  }
}

export async function getAchievementsListPayload(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<
  | {
      achievements: AchievementListItem[];
      counts: {
        binder_count: number;
        card_count: number;
        scan_count: number;
      };
    }
  | { error: string }
> {
  const [achRes, uaRes, bindersCount, cardsCount, scansCount] =
    await Promise.all([
      supabase.from("achievements").select("*"),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", userId),
      supabase
        .from("binders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("scan_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  if (achRes.error) {
    return { error: achRes.error.message };
  }
  if (uaRes.error) {
    return { error: uaRes.error.message };
  }

  const counts = {
    binder: bindersCount.count ?? 0,
    card: cardsCount.count ?? 0,
    scan: scansCount.count ?? 0,
  };

  const unlockedMap = new Map(
    (uaRes.data ?? []).map((r) => [r.achievement_id, r.unlocked_at])
  );

  const achievements = (achRes.data ?? []).map((a) => {
    const unlocked = unlockedMap.has(a.id);
    const progress = metricCount(a.requirement_type, counts);

    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      description: a.description,
      icon: a.icon,
      category: a.category ?? "Misc",
      rarity: normalizeRarity((a as { rarity?: string }).rarity),
      requirement_type: a.requirement_type,
      requirement_value: a.requirement_value,
      created_at: a.created_at,
      unlocked,
      unlocked_at: unlockedMap.get(a.id) ?? null,
      progress,
    };
  });

  return {
    achievements,
    counts: {
      binder_count: counts.binder,
      card_count: counts.card,
      scan_count: counts.scan,
    },
  };
}
