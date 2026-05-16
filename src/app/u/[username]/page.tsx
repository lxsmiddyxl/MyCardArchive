import { aggregateProfileStats } from "@/lib/binders/profile-stats";
import { parseProfileTheme } from "@/lib/binders/portfolio-types";
import { mcaPublicShareMetadata } from "@/lib/seo/public-share-metadata";
import { getProfileFollowCounts, isFollowing } from "@/lib/social/user-follow";
import { createClient } from "@/lib/supabase/server";
import { UserProfilePage } from "@/mca-ui/profile/UserProfilePage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: { username: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const handle = params.username?.trim().replace(/^@/, "").toLowerCase() ?? "";
  if (!handle) return { title: "Collector profile" };

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, handle, bio")
    .ilike("handle", handle)
    .maybeSingle();

  const label = profile?.display_name?.trim() || (profile?.handle ? `@${profile.handle}` : `@${handle}`);
  const description =
    profile?.bio?.trim() || `Collector profile for ${label} on MyCardArchive.`;

  return mcaPublicShareMetadata({
    title: `${label} · Collector profile`,
    description,
    path: `/u/${handle}`,
    ogImagePath: profile?.id ? `/user/${profile.id}/opengraph-image` : undefined,
  });
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
    .select(
      "id, display_name, handle, username, bio, avatar_url, created_at, profile_theme, profile_banner_url"
    )
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

  const { data: showcaseRows } = await supabase
    .from("profile_showcase_items")
    .select("id, binder_id, group_id, position")
    .eq("user_id", profile.id)
    .order("position", { ascending: true });

  const showcaseBinderIds = (showcaseRows ?? [])
    .map((r) => r.binder_id)
    .filter(Boolean) as string[];
  const showcaseGroupIds = (showcaseRows ?? [])
    .map((r) => r.group_id)
    .filter(Boolean) as string[];

  const [{ data: showcaseBinders }, { data: showcaseGroups }] = await Promise.all([
    showcaseBinderIds.length
      ? supabase.from("binders").select("id, name").in("id", showcaseBinderIds)
      : Promise.resolve({ data: [] }),
    showcaseGroupIds.length
      ? supabase.from("binder_groups").select("id, title").in("id", showcaseGroupIds)
      : Promise.resolve({ data: [] }),
  ]);

  const binderNameMap = new Map((showcaseBinders ?? []).map((b) => [b.id, b.name]));
  const groupTitleMap = new Map((showcaseGroups ?? []).map((g) => [g.id, g.title]));

  const showcaseItems = (showcaseRows ?? []).map((r) => ({
    id: r.id,
    binder_id: r.binder_id,
    group_id: r.group_id,
    position: r.position,
    binder_name: r.binder_id ? binderNameMap.get(r.binder_id) ?? null : null,
    group_title: r.group_id ? groupTitleMap.get(r.group_id) ?? null : null,
    share_url: r.binder_id ? `/b/${r.binder_id}` : r.group_id ? `/g/${r.group_id}` : null,
  }));

  const [{ count: binderCount }, { count: cardCount }] = await Promise.all([
    supabase
      .from("binders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  const stats = aggregateProfileStats({
    binderCount: binderCount ?? 0,
    insightsList: [
      {
        overview: {
          binder_id: "",
          name: "",
          description: null,
          created_at: "",
          updated_at: null,
          total_cards: cardCount ?? 0,
          unique_catalog_cards: cardCount ?? 0,
          sets_represented: 0,
        },
        sets: [],
        rarity_distribution: {
          common: 0,
          uncommon: 0,
          rare: 0,
          ultra: 0,
          secret: 0,
          other: 0,
        },
        variant_distribution: {
          standard: 0,
          holo: 0,
          reverse: 0,
          promo: 0,
          alt_art: 0,
          other: 0,
        },
        duplicate_count: 0,
        total_variants: 0,
      },
    ],
  });

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
        profileTheme={parseProfileTheme(profile.profile_theme)}
        bannerUrl={profile.profile_banner_url}
        stats={stats}
        showcaseItems={showcaseItems}
        isOwnProfile={viewer?.id === profile.id}
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
