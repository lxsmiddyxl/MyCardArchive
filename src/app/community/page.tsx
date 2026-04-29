import { CollectorQuickSearch } from "@/components/search/collector-quick-search";
import { CommunityFeedClient } from "@/components/community/community-feed-client";
import { RecommendedCollectorsStrip } from "@/components/social/recommended-collectors-strip";
import { AuthenticatedPresenceShell } from "@/components/realtime/app-wide-presence";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Community",
};

export default async function CommunityPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/community");
  }

  return (
    <AuthenticatedPresenceShell userId={user.id}>
      <div className="space-y-mca-xl">
        <SurfaceMountTelemetry name="community-feed" surfaceName="community" />
        <header className="border-b border-mca-border pb-mca-lg">
          <p className="mca-typo-label">Social</p>
          <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">
            Community
          </h1>
          <p className="mt-mca-md text-mca-body text-mca-ink-muted">
            Non-transactional posts about collecting, decks, and the hobby. Trades still happen in
            Matching and Trades.
          </p>
          <div className="mt-mca-md max-w-xl">
            <CollectorQuickSearch />
          </div>
        </header>
        <RecommendedCollectorsStrip limit={8} />
        <CommunityFeedClient currentUserId={user.id} />
      </div>
    </AuthenticatedPresenceShell>
  );
}
