import { MatchSuggestionsInline } from "@/components/matching/match-suggestions-inline";
import { AuthenticatedPresenceShell } from "@/components/realtime/app-wide-presence";
import { ProfilePresenceBanner } from "@/components/profile/profile-presence-banner";
import { OwnProfileCard } from "@/components/social/own-profile-card";
import { RecommendedCollectorsStrip } from "@/components/social/recommended-collectors-strip";
import { SocialMutualsStrip } from "@/components/social/social-mutuals-strip";
import { SocialRecommendationsStrip } from "@/components/social/social-recommendations-strip";
import { SocialRecentActivity } from "@/components/social/social-recent-activity";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { mapShowcaseRowToPublicV1 } from "@/lib/showcases/map-showcase-public";
import { isShowcaseFeaturedFromDescription } from "@/lib/showcases/showcase-featured-meta";
import { loadSelfSocialProfile } from "@/lib/social/build-profile";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/mca-ui/panel";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/profile"));
  }

  const loaded = await loadSelfSocialProfile(supabase, user);
  const selfProfile = "error" in loaded ? null : loaded;

  const { data: showcaseRows } = await supabase
    .from("collection_showcases")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const list = showcaseRows ?? [];
  const featuredRow = list.find((r) => isShowcaseFeaturedFromDescription(r.description)) ?? list[0];
  const featuredShowcase = featuredRow ? mapShowcaseRowToPublicV1(featuredRow) : null;

  return (
    <AuthenticatedPresenceShell userId={user.id}>
      <div className="space-y-mca-xl">
        <SurfaceMountTelemetry name="profile-page" surfaceName="profile" />
        <header className="scroll-mt-24 border-b border-mca-border pb-mca-lg">
          <p className="mca-typo-label">Account</p>
          <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">
            Profile
          </h1>
          {user.email ? (
            <p className="mca-typo-body mt-mca-xs text-mca-ink-subtle">{user.email}</p>
          ) : null}
          <ProfilePresenceBanner />
          <Link
            href={`/profile/${encodeURIComponent(user.id)}`}
            className="mt-mca-sm inline-block text-sm font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Open public profile
          </Link>
          <Link
            href="/profile/edit"
            className="mt-mca-md inline-block text-sm font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Edit profile & avatar
          </Link>
          <Link
            href="/feed"
            className="mt-mca-md inline-block text-sm font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            ← Feed
          </Link>
        </header>

        {selfProfile ? (
          <OwnProfileCard profile={selfProfile} publicProfileHref={`/profile/${encodeURIComponent(user.id)}`} />
        ) : (
          <p className="text-mca-body text-mca-error-accent">Could not load profile row.</p>
        )}

        {featuredShowcase ? (
          <Panel className="border border-mca-border/80 bg-mca-surface-elevated/40 p-mca-md shadow-mca-panel">
            <p className="mca-typo-label text-mca-ink-muted">Featured showcase</p>
            <h2 className="mt-mca-xs text-lg font-semibold text-mca-ink-strong">{featuredShowcase.title}</h2>
            {featuredShowcase.description ? (
              <p className="mt-mca-sm text-sm text-mca-ink-body">{featuredShowcase.description}</p>
            ) : null}
            <div className="mt-mca-md flex flex-wrap gap-mca-sm">
              <Link
                href={`/showcase/${encodeURIComponent(featuredShowcase.id)}`}
                className="text-sm font-semibold text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
              >
                Open showcase
              </Link>
              <Link
                href="/showcase"
                className="text-sm font-medium text-mca-ink-muted transition duration-200 ease-mca-standard hover:text-mca-ink-body"
              >
                Manage showcases
              </Link>
            </div>
          </Panel>
        ) : null}

        <SocialMutualsStrip />
        <RecommendedCollectorsStrip limit={8} />
        <SocialRecommendationsStrip />

        <SocialRecentActivity />

        <MatchSuggestionsInline
          title="Potential matches"
          description="Collectors whose binders overlap with your want list and haves. Start a trade from Match or New trade when you’re ready."
          limit={8}
          container="section"
          showViewAllLink
        />
      </div>
    </AuthenticatedPresenceShell>
  );
}
