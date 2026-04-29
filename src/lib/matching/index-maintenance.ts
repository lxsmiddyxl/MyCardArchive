/**
 * Real-time maintenance for `user_havelist_index` / `user_wantlist_index`.
 * Use the same Supabase client as the caller (cookie / user context). RLS applies.
 *
 * Requires DELETE privilege and delete policies on the index tables (see migrations).
 */

import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type IndexTable = "user_havelist_index" | "user_wantlist_index";

async function deleteIndexRow(
  supabase: SupabaseClient<Database>,
  table: IndexTable,
  userId: string,
  cardId: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId)
    .eq("card_id", cardId);
  if (error) throw new Error(error.message);
}

async function upsertIndexRow(
  supabase: SupabaseClient<Database>,
  table: IndexTable,
  userId: string,
  cardId: string,
  quantity: number
): Promise<void> {
  const { error } = await supabase.from(table).upsert(
    { user_id: userId, card_id: cardId, quantity },
    { onConflict: "user_id,card_id" }
  );
  if (error) throw new Error(error.message);
}

async function fetchIndexQuantity(
  supabase: SupabaseClient<Database>,
  table: IndexTable,
  userId: string,
  cardId: string
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select("quantity")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.quantity ?? 0;
}

/** Set absolute quantity for a have-list index row; removes the row if quantity ≤ 0. */
export async function setHaveListEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string,
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    await deleteIndexRow(supabase, "user_havelist_index", userId, cardId);
    return;
  }
  await upsertIndexRow(supabase, "user_havelist_index", userId, cardId, quantity);
}

/** Add delta to have-list quantity; deletes the row if the new total is ≤ 0. */
export async function updateHaveListIndex(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string,
  quantityDelta: number
): Promise<void> {
  if (quantityDelta === 0) return;
  const current = await fetchIndexQuantity(
    supabase,
    "user_havelist_index",
    userId,
    cardId
  );
  const next = current + quantityDelta;
  if (next <= 0) {
    if (current > 0) {
      await deleteIndexRow(supabase, "user_havelist_index", userId, cardId);
    }
    return;
  }
  await upsertIndexRow(supabase, "user_havelist_index", userId, cardId, next);
}

export async function removeHaveListEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string
): Promise<void> {
  await deleteIndexRow(supabase, "user_havelist_index", userId, cardId);
}

/** Set absolute quantity for a want-list index row; removes the row if quantity ≤ 0. */
export async function setWantListEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string,
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    await deleteIndexRow(supabase, "user_wantlist_index", userId, cardId);
    return;
  }
  await upsertIndexRow(supabase, "user_wantlist_index", userId, cardId, quantity);
}

/** Add delta to want-list quantity; deletes the row if the new total is ≤ 0. */
export async function updateWantListIndex(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string,
  quantityDelta: number
): Promise<void> {
  if (quantityDelta === 0) return;
  const current = await fetchIndexQuantity(
    supabase,
    "user_wantlist_index",
    userId,
    cardId
  );
  const next = current + quantityDelta;
  if (next <= 0) {
    if (current > 0) {
      await deleteIndexRow(supabase, "user_wantlist_index", userId, cardId);
    }
    return;
  }
  await upsertIndexRow(supabase, "user_wantlist_index", userId, cardId, next);
}

export async function removeWantListEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  cardId: string
): Promise<void> {
  await deleteIndexRow(supabase, "user_wantlist_index", userId, cardId);
}
