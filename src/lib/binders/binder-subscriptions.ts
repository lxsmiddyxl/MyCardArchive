import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isBinderShareable, parseBinderVisibility } from "./binder-social-types";

export type SubscriberEntry = {
  user_id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  created_at: string;
};

export async function getBinderSubscriberCount(
  supabase: SupabaseClient<Database>,
  binderId: string
): Promise<number> {
  const { data } = await supabase.rpc("get_binder_subscriber_count", {
    p_binder_id: binderId,
  });
  return typeof data === "number" ? data : 0;
}

export async function isSubscribedToBinder(
  supabase: SupabaseClient<Database>,
  userId: string,
  binderId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("binder_subscriptions")
    .select("id")
    .eq("binder_id", binderId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function subscribeToBinder(
  supabase: SupabaseClient<Database>,
  userId: string,
  binderId: string
): Promise<{ ok: true; alreadySubscribed?: boolean } | { ok: false; error: string }> {
  const { data: binder } = await supabase
    .from("binders")
    .select("id, visibility, user_id")
    .eq("id", binderId)
    .maybeSingle();

  if (!binder) return { ok: false, error: "Binder not found" };
  if (!isBinderShareable(parseBinderVisibility(binder.visibility))) {
    return { ok: false, error: "Binder is not shareable" };
  }
  if (binder.user_id === userId) {
    return { ok: false, error: "Cannot subscribe to your own binder" };
  }

  const { error } = await supabase.from("binder_subscriptions").insert({
    binder_id: binderId,
    user_id: userId,
  });

  if (error) {
    if (error.code === "23505") return { ok: true, alreadySubscribed: true };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function unsubscribeFromBinder(
  supabase: SupabaseClient<Database>,
  userId: string,
  binderId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("binder_subscriptions")
    .delete()
    .eq("binder_id", binderId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listBinderSubscribers(
  supabase: SupabaseClient<Database>,
  binderId: string,
  limit = 50
): Promise<SubscriberEntry[]> {
  const { data: rows } = await supabase
    .from("binder_subscriptions")
    .select("user_id, created_at")
    .eq("binder_id", binderId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];

  const ids = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("social_public_profiles")
    .select("user_id, display_name, handle, username, avatar_url")
    .in("user_id", ids);

  const map = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      {
        display_name: p.display_name?.trim() || p.username?.trim() || "Collector",
        handle: p.handle?.trim() ?? null,
        avatar_url: p.avatar_url,
      },
    ])
  );

  return rows.map((r) => {
    const p = map.get(r.user_id);
    return {
      user_id: r.user_id,
      display_name: p?.display_name ?? "Collector",
      handle: p?.handle ?? null,
      avatar_url: p?.avatar_url ?? null,
      created_at: r.created_at,
    };
  });
}

export async function listBinderSubscriberUserIds(
  supabase: SupabaseClient<Database>,
  binderId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("binder_subscriptions")
    .select("user_id")
    .eq("binder_id", binderId);
  return (data ?? []).map((r) => r.user_id);
}
