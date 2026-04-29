export type AnalyticsSummary = {
  card_count: number;
  unique_cards: number;
  total_value: number;
};

export type TopCardEntry = {
  card_id: string;
  binder_id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  estimated_value_usd: number;
};

export type RecentScanEntry = {
  id: string;
  created_at: string;
  card_id: string | null;
  summary: string | null;
};

/**
 * API / UI payload for binder or collection analytics.
 */
export type AnalyticsResult = {
  summary: AnalyticsSummary;
  rarity_breakdown: Record<string, number>;
  set_breakdown: Record<string, number>;
  top_cards: TopCardEntry[];
  recent_scans: RecentScanEntry[];
  monthly_scan_activity: Record<string, number>;
};

export const EMPTY_ANALYTICS: AnalyticsResult = {
  summary: {
    card_count: 0,
    unique_cards: 0,
    total_value: 0,
  },
  rarity_breakdown: {},
  set_breakdown: {},
  top_cards: [],
  recent_scans: [],
  monthly_scan_activity: {},
};
