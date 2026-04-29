import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/types/database.types";
import { ensureUserTier } from "./ensure-tier";

export type AppSupabaseClient = SupabaseClient<Database>;

export class TierLimitError extends Error {
  readonly code: "binder" | "card" | "scan";
  /** Optional machine code for API clients (e.g. scan pack upsell vs tier feature gate). */
  readonly apiCode?: string;

  constructor(
    code: TierLimitError["code"],
    message: string,
    opts?: { apiCode?: string }
  ) {
    super(message);
    this.name = "TierLimitError";
    this.code = code;
    this.apiCode = opts?.apiCode;
  }
}

export function isTierLimitError(e: unknown): e is TierLimitError {
  return e instanceof TierLimitError;
}

export type UserTierRecord = {
  tier_slug: string;
  binder_limit: number;
  card_limit: number;
  scan_limit: number;
  bonus_scans_remaining: number;
};

/** scan_limit <= 0 means unlimited (reserved; DB default is positive). */
export function isUnlimitedScans(scanLimit: number): boolean {
  return scanLimit <= 0;
}

async function selectUserTierRow(
  client: AppSupabaseClient,
  userId: string
): Promise<UserTierRecord | null> {
  const { data, error } = await client
    .from("user_tiers")
    .select("tier_slug, binder_limit, card_limit, scan_limit, bonus_scans_remaining")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    tier_slug: data.tier_slug,
    binder_limit: data.binder_limit,
    card_limit: data.card_limit,
    scan_limit: data.scan_limit,
    bonus_scans_remaining: data.bonus_scans_remaining ?? 0,
  };
}

/**
 * Load the signed-in user's tier row. Returns null if unauthenticated.
 * If no row exists, calls ensureUserTier (default free tier) and re-queries.
 */
export async function getUserTier(
  client: AppSupabaseClient
): Promise<UserTierRecord | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  let row = await selectUserTierRow(client, user.id);
  if (row) {
    return row;
  }

  await ensureUserTier(client);
  row = await selectUserTierRow(client, user.id);
  return row;
}

export async function getBinderCount(client: AppSupabaseClient): Promise<number> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await client
    .from("binders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getCardCount(client: AppSupabaseClient): Promise<number> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await client
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

function startOfUtcMonth(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function getScanCountThisMonth(
  client: AppSupabaseClient
): Promise<number> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await client
    .from("scan_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfUtcMonth());

  if (error) {
    return 0;
  }

  return count ?? 0;
}

/**
 * Remaining scans this UTC month: plan pool + bonus, minus events already recorded.
 * Returns `null` when the plan has unlimited scans.
 */
export function remainingScansThisMonth(
  tier: UserTierRecord,
  usedThisMonth: number
): number | null {
  if (isUnlimitedScans(tier.scan_limit)) {
    return null;
  }
  const raw =
    tier.scan_limit - usedThisMonth + (tier.bonus_scans_remaining ?? 0);
  return Math.max(0, raw);
}

export async function assertCanCreateBinder(
  client: AppSupabaseClient
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new TierLimitError(
      "binder",
      "You must be signed in to create a binder."
    );
  }

  await ensureUserTier(client);
  const tier = await getUserTier(client);
  if (!tier) {
    throw new TierLimitError(
      "binder",
      "No active plan found. Visit /tier or GET /api/tier/repair to finish setup."
    );
  }

  const count = await getBinderCount(client);
  if (tier.binder_limit <= 0) {
    return;
  }
  if (count >= tier.binder_limit) {
    throw new TierLimitError(
      "binder",
      `You've reached your binder limit (${tier.binder_limit} binders on your ${tier.tier_slug} plan). Upgrade on /tier to add more.`
    );
  }
}

export async function assertCanCreateCard(
  client: AppSupabaseClient
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new TierLimitError("card", "You must be signed in to add a card.");
  }

  await ensureUserTier(client);
  const tier = await getUserTier(client);
  if (!tier) {
    throw new TierLimitError(
      "card",
      "No active plan found. Visit /tier or GET /api/tier/repair to finish setup."
    );
  }

  const count = await getCardCount(client);
  if (tier.card_limit <= 0) {
    return;
  }
  if (count >= tier.card_limit) {
    throw new TierLimitError(
      "card",
      `You've reached your card limit (${tier.card_limit.toLocaleString()} cards on your ${tier.tier_slug} plan). Upgrade on /tier to add more.`
    );
  }
}

export async function assertCanCreateScan(
  client: AppSupabaseClient
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new TierLimitError("scan", "You must be signed in to scan.");
  }

  await ensureUserTier(client);
  const tier = await getUserTier(client);
  if (!tier) {
    throw new TierLimitError(
      "scan",
      "No active plan found. Visit /tier or GET /api/tier/repair to finish setup."
    );
  }

  if (isUnlimitedScans(tier.scan_limit)) {
    return;
  }

  const used = await getScanCountThisMonth(client);
  const remaining = remainingScansThisMonth(tier, used);
  if (remaining !== null && remaining <= 0) {
    throw new TierLimitError(
      "scan",
      "You've used all scans for this month. Upgrade your plan on /tier or buy a scan pack to keep scanning.",
      { apiCode: "SCAN_LIMIT_EXHAUSTED" }
    );
  }
}
