/** Creator tools v1 — showcase notes & public shapes (Phase 72). */

export type ShowcasePublicV1DTO = {  id: string;
  user_id: string;
  title: string;
  description: string | null;
  binder_ids: string[];
  featured_card_ids: string[];
  created_at: string;
  updated_at: string;
  is_featured: boolean;
  analytics_saves?: number;
  analytics_views?: number;
};

export type ShowcaseNoteV1DTO = {
  id: string;
  author_id: string;
  text: string;
  created_at: string;
};
