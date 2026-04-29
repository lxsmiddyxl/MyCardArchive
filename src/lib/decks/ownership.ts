import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function fetchOwnedDeck(
  supabase: SupabaseClient<Database>,
  userId: string,
  deckId: string
) {
  return supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();
}
