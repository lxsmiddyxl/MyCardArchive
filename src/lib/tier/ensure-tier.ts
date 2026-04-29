import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/types/database.types";

export type AppSupabaseClient = SupabaseClient<Database>;

/** Matches columns returned from user_tiers and consumed by check-limits / UI. */
export type EnsuredUserTier = {
  tier_slug: string;
  binder_limit: number;
  card_limit: number;
  scan_limit: number;
};

const FREE_DEFAULT: EnsuredUserTier = {
  tier_slug: "free",
  binder_limit: 1,
  card_limit: 500,
  scan_limit: 50,
};

function mapRow(row: {
  tier_slug: string;
  binder_limit: number;
  card_limit: number;
  scan_limit: number;
}): EnsuredUserTier {
  return {
    tier_slug: row.tier_slug,
    binder_limit: row.binder_limit,
    card_limit: row.card_limit,
    scan_limit: row.scan_limit,
  };
}

/**
 * Ensures the signed-in user has a `user_tiers` row (default free tier if missing).
 * Returns null if unauthenticated or on hard failure (RLS / network).
 */
export async function ensureUserTier(
  client: AppSupabaseClient
): Promise<EnsuredUserTier | null> {
  try {
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return null;
    }

    const selectTier = () =>
      client
        .from("user_tiers")
        .select("tier_slug, binder_limit, card_limit, scan_limit, bonus_scans_remaining")
        .eq("user_id", user.id)
        .maybeSingle();

    const { data: existing } = await selectTier();
    if (existing) {
      return mapRow({
        tier_slug: existing.tier_slug,
        binder_limit: existing.binder_limit,
        card_limit: existing.card_limit,
        scan_limit: existing.scan_limit,
      });
    }

    const { error: insertError } = await client.from("user_tiers").insert({
      user_id: user.id,
      tier_slug: FREE_DEFAULT.tier_slug,
      binder_limit: FREE_DEFAULT.binder_limit,
      card_limit: FREE_DEFAULT.card_limit,
      scan_limit: FREE_DEFAULT.scan_limit,
      bonus_scans_remaining: 0,
    });

    if (insertError) {
      const { data: raced } = await selectTier();
      if (raced) {
        return mapRow({
          tier_slug: raced.tier_slug,
          binder_limit: raced.binder_limit,
          card_limit: raced.card_limit,
          scan_limit: raced.scan_limit,
        });
      }
      return null;
    }

    const { data: created } = await selectTier();
    if (created) {
      return mapRow({
        tier_slug: created.tier_slug,
        binder_limit: created.binder_limit,
        card_limit: created.card_limit,
        scan_limit: created.scan_limit,
      });
    }

    return { ...FREE_DEFAULT };
  } catch {
    return null;
  }
}
