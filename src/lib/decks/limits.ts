import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export class DeckLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckLimitError";
  }
}

export function isDeckLimitError(e: unknown): e is DeckLimitError {
  return e instanceof DeckLimitError;
}

/** Exported for entitlement resolution — `null` means unlimited decks. */
export function maxDecksForTierSlug(tierSlug: string | null | undefined): number | null {
  const s = (tierSlug ?? "free").trim().toLowerCase();
  if (s === "elite") return null;
  if (s === "pro") return 10;
  return 1;
}

/**
 * Throws if the user cannot create another deck (mirrors DB enforce_deck_limit).
 */
export async function assertCanCreateDeck(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  if (await isCurrentUserInternalUnlimited(supabase)) {
    return;
  }

  const { data: tier, error: tierErr } = await supabase
    .from("user_tiers")
    .select("tier_slug")
    .eq("user_id", userId)
    .maybeSingle();

  if (tierErr) {
    throw new Error(tierErr.message);
  }

  const max = maxDecksForTierSlug(tier?.tier_slug);
  if (max === null) {
    return;
  }

  const { count, error: countErr } = await supabase
    .from("decks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countErr) {
    throw new Error(countErr.message);
  }

  if ((count ?? 0) >= max) {
    throw new DeckLimitError("Deck limit reached for your tier.");
  }
}
