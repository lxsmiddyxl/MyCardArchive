export type BinderVisibility = "private" | "unlisted" | "public";

export const BINDER_VISIBILITY_LABELS: Record<BinderVisibility, string> = {
  private: "Private",
  unlisted: "Unlisted",
  public: "Public",
};

export type BinderActivityType =
  | "binder_created"
  | "card_added"
  | "card_removed"
  | "layout_changed"
  | "theme_changed"
  | "visibility_changed";

export type BinderActivityRow = {
  id: string;
  binder_id: string;
  user_id: string;
  type: BinderActivityType;
  payload: Record<string, unknown>;
  created_at: string;
};

export type BinderCommentRow = {
  id: string;
  binder_id: string;
  user_id: string;
  text: string;
  created_at: string;
  author_display?: string | null;
  author_handle?: string | null;
};

export type BinderReactionRow = {
  id: string;
  binder_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export function parseBinderVisibility(raw: string | null | undefined): BinderVisibility {
  if (raw === "unlisted" || raw === "public") return raw;
  return "private";
}

export function isBinderShareable(visibility: BinderVisibility): boolean {
  return visibility === "unlisted" || visibility === "public";
}

export function activityPayloadFromJson(
  val: import("@/lib/supabase/types").Json | null
): Record<string, unknown> {
  if (!val || typeof val !== "object" || Array.isArray(val)) return {};
  return val as Record<string, unknown>;
}
