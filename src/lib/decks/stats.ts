import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const POKEMON_STYLE_TYPES = new Set([
  "grass",
  "fire",
  "water",
  "lightning",
  "psychic",
  "fighting",
  "darkness",
  "metal",
  "fairy",
  "dragon",
  "colorless",
  "normal",
]);

type DeckCardRow = {
  quantity: number;
  card_id: string;
  cards: {
    id: string;
    catalog_card_id: string | null;
    name: string;
    catalog_cards: {
      subtypes: string[];
      supertype: string | null;
    } | null;
  } | null;
};

function normalizeColorTokens(row: DeckCardRow): string[] {
  const cc = row.cards?.catalog_cards;
  if (!cc) {
    return [];
  }
  const out = new Set<string>();
  for (const st of cc.subtypes ?? []) {
    const t = st.trim().toLowerCase();
    if (POKEMON_STYLE_TYPES.has(t)) {
      out.add(t);
    }
  }
  return Array.from(out);
}

/**
 * Recomputes total_cards, unique_cards, color_identity, legality_status for a deck.
 * Does not modify synergy_score (use computeAndPersistSynergy).
 */
export async function refreshDeckStats(
  supabase: SupabaseClient<Database>,
  deckId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: rows, error: fetchErr } = await supabase
    .from("deck_cards")
    .select(
      `
      quantity,
      card_id,
      cards (
        id,
        catalog_card_id,
        name,
        catalog_cards ( subtypes, supertype )
      )
    `
    )
    .eq("deck_id", deckId);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  const list = (rows ?? []) as unknown as DeckCardRow[];
  let total = 0;
  const distinct = new Set<string>();
  const colors = new Set<string>();

  for (const r of list) {
    total += r.quantity;
    distinct.add(r.card_id);
    for (const c of normalizeColorTokens(r)) {
      colors.add(c);
    }
  }

  const color_identity = Array.from(colors).sort();

  const { error: upErr } = await supabase
    .from("deck_stats")
    .update({
      total_cards: total,
      unique_cards: distinct.size,
      color_identity,
      legality_status: "casual",
      updated_at: new Date().toISOString(),
    })
    .eq("deck_id", deckId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  return { ok: true };
}

function weightedKeyShare(
  items: { q: number; key: string | null }[]
): number {
  let total = 0;
  const map = new Map<string, number>();
  for (const it of items) {
    if (!it.key) continue;
    total += it.q;
    map.set(it.key, (map.get(it.key) ?? 0) + it.q);
  }
  if (!total) return 0;
  let max = 0;
  map.forEach((v) => {
    max = Math.max(max, v);
  });
  return max / total;
}

/**
 * Heuristic synergy 0–100: type focus, supertype consistency, name “tribal” hint, combo stub.
 */
export function computeSynergyScore(rows: DeckCardRow[]): number {
  if (rows.length === 0) {
    return 0;
  }

  const weighted: { q: number; st: string; su: string; name: string }[] = [];
  for (const r of rows) {
    const cc = r.cards?.catalog_cards;
    const primarySubtype =
      cc?.subtypes?.find((s) => POKEMON_STYLE_TYPES.has(s.toLowerCase())) ??
      cc?.subtypes?.[0] ??
      null;
    weighted.push({
      q: r.quantity,
      st: primarySubtype?.toLowerCase() ?? "unknown",
      su: (cc?.supertype ?? "unknown").toLowerCase(),
      name: (r.cards?.name ?? "").toLowerCase(),
    });
  }

  const subtypeShare = weightedKeyShare(
    weighted.map((w) => ({
      q: w.q,
      key: w.st === "unknown" ? null : w.st,
    }))
  );
  const superShare = weightedKeyShare(
    weighted.map((w) => ({
      q: w.q,
      key: w.su === "unknown" ? null : w.su,
    }))
  );

  const tokCounts = new Map<string, number>();
  let tokWeight = 0;
  for (const w of weighted) {
    for (const t of w.name.split(/\s+/).filter((x) => x.length > 3)) {
      tokCounts.set(t, (tokCounts.get(t) ?? 0) + w.q);
      tokWeight += w.q;
    }
  }
  let maxTok = 0;
  tokCounts.forEach((v) => {
    maxTok = Math.max(maxTok, v);
  });
  const tribal = tokWeight ? maxTok / tokWeight : 0;

  const qtys = weighted.map((w) => w.q);
  const mean = qtys.reduce((a, b) => a + b, 0) / qtys.length;
  const varSum = qtys.reduce((a, q) => a + (q - mean) ** 2, 0) / qtys.length;
  const curveBalance = 1 - Math.min(1, varSum / (mean * mean + 1));

  let score =
    subtypeShare * 34 +
    superShare * 22 +
    tribal * 18 +
    curveBalance * 16 +
    5;

  score = Math.round(Math.min(100, Math.max(0, score)));
  return score;
}

export async function computeAndPersistSynergy(
  supabase: SupabaseClient<Database>,
  deckId: string
): Promise<
  { ok: true; synergy_score: number } | { ok: false; error: string }
> {
  const { data: rows, error: fetchErr } = await supabase
    .from("deck_cards")
    .select(
      `
      quantity,
      card_id,
      cards (
        id,
        catalog_card_id,
        name,
        catalog_cards ( subtypes, supertype )
      )
    `
    )
    .eq("deck_id", deckId);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  const list = (rows ?? []) as unknown as DeckCardRow[];
  const synergy_score = computeSynergyScore(list);

  const { error: upErr } = await supabase
    .from("deck_stats")
    .update({
      synergy_score,
      updated_at: new Date().toISOString(),
    })
    .eq("deck_id", deckId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  return { ok: true, synergy_score };
}
