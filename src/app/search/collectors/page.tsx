import { CollectorsSearchClient } from "@/components/search/collectors-search-client";
import { SocialSuggestedCollectorsStrip } from "@/components/social/social-suggested-collectors-strip";
import { AuthenticatedPresenceShell } from "@/components/realtime/app-wide-presence";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Find collectors",
};

export default async function CollectorsSearchPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/search/collectors"));
  }

  return (
    <AuthenticatedPresenceShell userId={user.id}>
      <div className="space-y-mca-lg pb-[max(4rem,env(safe-area-inset-bottom))]">
        <header className="border-b border-mca-border pb-mca-lg">
          <p className="mca-typo-label">Discover</p>
          <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">
            Find collectors
          </h1>
          <p className="mt-mca-md max-w-2xl text-mca-body text-mca-ink-muted">
            Search by public persona text, play & fandom pins, coarse value and trade bands, clubs, journeys,
            seasons, and recent activity — all identity-driven, never a leaderboard.
          </p>
        </header>
        <SocialSuggestedCollectorsStrip />
        <CollectorsSearchClient />
      </div>
    </AuthenticatedPresenceShell>
  );
}
