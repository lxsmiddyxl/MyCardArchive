export interface AutoMatchCandidate {
  card_name: string;
  set_name: string;
  number: string;
  rarity: string | null;
  image_url: string | null;
  confidence: number;
  /** Official catalog row id when matched from `catalog_cards`. */
  catalog_card_id?: string | null;
  /** Pokémon TCG set id (e.g. sv1). */
  set_id?: string | null;
}

export interface AutoMatchResult {
  matches: AutoMatchCandidate[];
  best_match: AutoMatchCandidate | null;
}
