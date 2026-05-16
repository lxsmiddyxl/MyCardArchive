import { getProfileFollowCounts, isFollowing } from "@/lib/social/user-follow";
import { createClient } from "@/lib/supabase/server";
import { UserProfilePage } from "@/mca-ui/profile/UserProfilePage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: { username: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const handle = params.username?.trim().replace(/^@/, "") ?? "";
  return { title: handle ? `@${handle}` : "Collector profile" };
}

export default async function UserProfileRoute({ params }: PageProps) {
  const handle = params.username?.trim().replace(/^@/, "").toLowerCase() ?? "";
  if (!handle) notFound();

  const supabase = createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, handle, username, bio, avatar_url, created_at")
    .ilike("handle", handle)
    .maybeSingle();

  if (!profile) notFound();

  const { data: publicBinders } = await supabase
    .from("binders")
    .select("id, name, description, visibility, updated_at")
    .eq("user_id", profile.id)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(24);

  const { data: activity } = await supabase
    .from("binder_activity")
    .select("id, binder_id, type, payload, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const counts = await getProfileFollowCounts(supabase, profile.id);
  const viewerFollowing =
    viewer && viewer.id !== profile.id
      ? await isFollowing(supabase, viewer.id, profile.id)
      : false;

  return (
    <div className="py-mca-lg">
      <UserProfilePage
        displayName={profile.display_name}
        username={profile.handle ?? profile.username}
        bio={profile.bio}
        avatarUrl={profile.avatar_url}
        followerCount={counts.followers}
        followingCount={counts.following}
        viewerFollowing={viewerFollowing}
        canFollow={Boolean(viewer && viewer.id !== profile.id)}
        publicBinders={(publicBinders ?? []).map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          share_url: `/b/${b.id}`,
          updated_at: b.updated_at,
        }))}
        recentActivity={activity ?? []}
      />
    </div>
  );
}
