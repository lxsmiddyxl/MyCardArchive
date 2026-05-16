export type ProfileTheme = "color" | "holo" | "dark";

export const PROFILE_THEMES: ProfileTheme[] = ["color", "holo", "dark"];

export function parseProfileTheme(raw: string | null | undefined): ProfileTheme {
  if (raw === "holo" || raw === "dark") return raw;
  return "color";
}

export type BinderCollectionRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type BinderCollectionItemRow = {
  id: string;
  collection_id: string;
  binder_id: string;
  position: number;
  binder_name?: string;
};

export type BinderGroupRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
};

export type BinderGroupItemRow = {
  id: string;
  group_id: string;
  binder_id: string;
  position: number;
  binder_name?: string;
};

export type ProfileShowcaseItemRow = {
  id: string;
  user_id: string;
  binder_id: string | null;
  group_id: string | null;
  position: number;
  binder_name?: string | null;
  group_title?: string | null;
};

export type BinderLinkRow = {
  id: string;
  binder_id: string;
  target_binder_id: string;
  label: string;
  created_at: string;
  target_name?: string;
  target_visibility?: string;
};
