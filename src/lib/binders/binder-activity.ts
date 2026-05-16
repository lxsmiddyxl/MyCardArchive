import type { Database, Json } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BinderActivityType } from "./binder-social-types";

export async function logBinderActivity(
  supabase: SupabaseClient<Database>,
  input: {
    binderId: string;
    userId: string;
    type: BinderActivityType;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("binder_activity").insert({
    binder_id: input.binderId,
    user_id: input.userId,
    type: input.type,
    payload: (input.payload ?? {}) as Json,
  });

  if (error) {
    /* non-fatal */
  }
}

export async function fetchBinderActivity(
  supabase: SupabaseClient<Database>,
  binderId: string,
  limit = 30
) {
  const { data, error } = await supabase
    .from("binder_activity")
    .select("id, binder_id, user_id, type, payload, created_at")
    .eq("binder_id", binderId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export function formatBinderActivityLabel(
  type: string,
  payload: Record<string, unknown>
): string {
  switch (type) {
    case "binder_created":
      return "Created this binder";
    case "card_added":
      return payload.card_name
        ? `Added ${String(payload.card_name)}`
        : "Added a card";
    case "card_removed":
      return "Removed a card";
    case "layout_changed":
      return payload.mode
        ? `Applied ${String(payload.mode)} layout`
        : "Updated layout";
    case "theme_changed":
      return payload.theme
        ? `Switched theme to ${String(payload.theme)}`
        : "Changed binder theme";
    case "visibility_changed":
      return payload.visibility
        ? `Set visibility to ${String(payload.visibility)}`
        : "Changed visibility";
    default:
      return "Binder updated";
  }
}
