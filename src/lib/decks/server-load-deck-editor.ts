import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DeckEditorPayload, DeckCardsBySection, DeckCardEmbedded } from "./editor-types";

function groupBySection(
  rows: DeckCardEmbedded[]
): DeckCardsBySection {
  const map = new Map<string, DeckCardEmbedded[]>();
  for (const r of rows) {
    const sec = r.section || "main";
    const list = map.get(sec);
    if (list) {
      list.push(r);
    } else {
      map.set(sec, [r]);
    }
  }
  return Object.fromEntries(map.entries());
}

/**
 * Loads deck editor payload for the page (same shape as GET /api/decks/[id]).
 */
export async function loadDeckEditorPayload(
  supabase: SupabaseClient<Database>,
  userId: string,
  deckId: string
): Promise<
  | { ok: true; data: DeckEditorPayload }
  | { ok: false; status: 404 | 403 | 500; message: string }
> {
  const { data: vis, error: visErr } = await supabase.rpc(
    "get_deck_visibility",
    { p_deck_id: deckId }
  );

  if (visErr) {
    return { ok: false, status: 500, message: visErr.message };
  }

  const visibility = vis as { found?: boolean; is_owner?: boolean } | null;
  if (!visibility?.found) {
    return { ok: false, status: 404, message: "Deck not found" };
  }
  if (!visibility.is_owner) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();

  if (deckErr) {
    return { ok: false, status: 500, message: deckErr.message };
  }
  if (!deck) {
    return { ok: false, status: 404, message: "Deck not found" };
  }

  const { data: stats, error: stErr } = await supabase
    .from("deck_stats")
    .select("*")
    .eq("deck_id", deckId)
    .maybeSingle();

  if (stErr) {
    return { ok: false, status: 500, message: stErr.message };
  }

  const { data: cardRows, error: cErr } = await supabase
    .from("deck_cards")
    .select(
      `
      *,
      cards (
        id,
        name,
        image_url,
        rarity,
        catalog_card_id,
        catalog_cards (
          id,
          name,
          number,
          rarity,
          supertype,
          subtypes,
          image_small,
          image_large,
          set_id,
          catalog_sets ( id, name )
        )
      )
    `
    )
    .eq("deck_id", deckId)
    .order("section", { ascending: true });

  if (cErr) {
    return { ok: false, status: 500, message: cErr.message };
  }

  const deck_cards_by_section = groupBySection(
    (cardRows ?? []) as unknown as DeckCardEmbedded[]
  );

  return {
    ok: true,
    data: {
      deck,
      deck_stats: stats,
      deck_cards_by_section,
    },
  };
}
