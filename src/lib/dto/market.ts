/** Client/API shapes for marketplace routes (`/api/market/*`). */

export type MarketCatalogRefDTO = {
  id: string;
  name: string;
  number: string;
  set_id: string;
} | null;

export type MarketWatchlistRowDTO = {
  catalog_card_id: string;
  created_at: string;
  catalog_cards?: MarketCatalogRefDTO | MarketCatalogRefDTO[];
};

export type MarketAlertPrefsDTO = {
  alert_ft_available: boolean;
  alert_trade_overlap: boolean;
  updated_at: string | null;
};

export type MarketWatchlistPayloadDTO = {
  items?: MarketWatchlistRowDTO[];
};

/** Alias for consolidated naming in UI layers. */
export type MarketWatchlistDTO = MarketWatchlistPayloadDTO;

export type MarketAlertPrefsPayloadDTO = {
  prefs?: MarketAlertPrefsDTO;
};

export type MarketAutoMatchReciprocalDTO = {
  other_user_id: string;
  you_receive_catalog_id: string;
  you_send_catalog_id: string;
};

export type MarketAutoMatchLoop3DTO = {
  u1: string;
  u2: string;
  u3: string;
  edge_12_catalog_id: string;
  edge_23_catalog_id: string;
  edge_31_catalog_id: string;
};

export type MarketAutoMatchPayloadDTO = {
  matches?: {
    reciprocal?: MarketAutoMatchReciprocalDTO[];
    loops_3?: MarketAutoMatchLoop3DTO[];
  };
};

export type MarketCatalogAggRowDTO = {
  catalog_card_id: string;
  card_count: number;
  collector_count: number;
};

export type MarketMatchHintDTO = {
  catalog_card_id: string;
  match_kind: "you_lf_they_ft" | "you_ft_they_lf" | string;
};

export type MarketDiscoveryPayloadDTO = {
  want_by_catalog: MarketCatalogAggRowDTO[] | null;
  offer_by_catalog: MarketCatalogAggRowDTO[] | null;
  match_hints: MarketMatchHintDTO[] | null;
};

export type MarketDiscoveryResponseDTO = {
  discovery?: MarketDiscoveryPayloadDTO | null;
};

/** Consolidated discovery body for UI layers (alias). */
export type MarketDiscoveryResultDTO = MarketDiscoveryPayloadDTO;

/** Generic OK/error envelope for market POST routes. */
export type MarketMutationResponseDTO = {
  ok?: boolean;
  error?: string;
};

/** Element of `best_trade_paths` in the engine graph (reciprocal or two_hop). */
export type MarketEngineTradePathDTO = {
  kind?: string;
  partner_user_id?: string;
  middle_user_id?: string;
  you_receive_catalog_id?: string;
  you_send_catalog_id?: string;
};

export type MarketEngineGraphDTO = {
  edge_count_out?: number;
  edge_count_in?: number;
  edges_out_sample?: { to_user_id: string; catalog_card_id: string }[];
  edges_in_sample?: { from_user_id: string; catalog_card_id: string }[];
  best_trade_paths?: MarketEngineTradePathDTO[];
  error?: string;
};

export type MarketEngineLoop3DTO = {
  u1: string;
  u2: string;
  u3: string;
  edge_12_catalog_id: string;
  edge_23_catalog_id: string;
  edge_31_catalog_id: string;
  party_count?: number;
};

export type MarketEngineLoop4DTO = {
  u1: string;
  u2: string;
  u3: string;
  u4: string;
  edge_12_catalog_id: string;
  edge_23_catalog_id: string;
  edge_34_catalog_id: string;
  edge_41_catalog_id: string;
  party_count?: number;
};

export type MarketEnginePayloadDTO = {
  graph?: MarketEngineGraphDTO;
  loops?: { loops_3?: MarketEngineLoop3DTO[]; loops_4?: MarketEngineLoop4DTO[] };
};

export type MarketCatalogPreviewPayloadDTO = {
  cards?: Record<
    string,
    {
      id: string;
      name: string;
      number?: string | null;
      image_small?: string | null;
      rarity?: string | null;
    }
  >;
};
