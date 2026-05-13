import type { ShowcasePublicV1DTO } from "@/lib/dto/showcase-creator";
import { isShowcaseFeaturedFromDescription, stripShowcaseMachineLines } from "@/lib/showcases/showcase-featured-meta";

type ShowcaseRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  binder_ids: string[];
  featured_card_ids: string[];
  created_at: string;
  updated_at: string;
  analytics_saves?: number;
  analytics_views?: number;
};

export function mapShowcaseRowToPublicV1(row: ShowcaseRow): ShowcasePublicV1DTO {
  const is_featured = isShowcaseFeaturedFromDescription(row.description);
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: stripShowcaseMachineLines(row.description),
    binder_ids: row.binder_ids ?? [],
    featured_card_ids: row.featured_card_ids ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_featured,
    analytics_saves: row.analytics_saves,
    analytics_views: row.analytics_views,
  };
}
