import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowListEntry = {
  user_id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  created_at: string;
};

export async function getProfileFollowCounts(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ followers: number; following: number }> {
  const { data } = await supabase.rpc("get_profile_follow_counts", {
    p_user_id: userId,
  });
  const row = data as { followers?: number; following?: number } | null;
  return {
    followers: row?.followers ?? 0,
    following: row?.following ?? 0,
  };
}

export async function isFollowing(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean(data);
}

export async function followUser(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string
): Promise<{ ok: true; alreadyFollowing?: boolean } | { ok: false; error: string }> {
  if (followerId === followingId) {
    return { ok: false, error: "Cannot follow yourself" };
  }

  await supabase.rpc("ensure_social_public_profile_projection", {
    p_user_id: followingId,
  });

  const { error } = await supabase.from("user_follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) {
    if (error.code === "23505") return { ok: true, alreadyFollowing: true };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function unfollowUser(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function enrichFollowList(
  supabase: SupabaseClient<Database>,
  rows: Array<{ user_id: string; created_at: string }>
): Promise<FollowListEntry[]> {
  if (!rows.length) return [];
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

export async function listFollowers(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 50
): Promise<FollowListEntry[]> {
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []).map((r) => ({
    user_id: r.follower_id,
    created_at: r.created_at,
  }));
  return enrichFollowList(supabase, rows);
}

export async function listFollowing(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 50
): Promise<FollowListEntry[]> {
  const { data } = await supabase
    .from("user_follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []).map((r) => ({
    user_id: r.following_id,
    created_at: r.created_at,
  }));
  return enrichFollowList(supabase, rows);
}
