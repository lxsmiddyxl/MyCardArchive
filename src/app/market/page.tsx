import { AuthenticatedPresenceShell } from "@/components/realtime/app-wide-presence";
import { MarketEnginePanel } from "@/components/market/market-engine-panel";
import { MarketAutoMatchPanel } from "@/components/market/market-auto-match-panel";
import { MarketDiscoveryClient } from "@/components/market/market-discovery-client";
import { MarketOffersPanel } from "@/components/market/market-offers-panel";
import { MarketV3ReadonlyPanel } from "@/components/market/market-v3-readonly-panel";
import { MarketWatchlistPanel } from "@/components/market/market-watchlist-panel";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Marketplace",
};

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/market"));
  }

  return (
    <AuthenticatedPresenceShell userId={user.id}>
      <div className="space-y-mca-xl">
        <SurfaceMountTelemetry name="market-page" surfaceName="marketplace" />
        <header className="border-b border-mca-border pb-mca-lg">
          <p className="mca-typo-label">Trading</p>
          <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">
            Marketplace discovery
          </h1>
          <p className="mt-mca-md text-mca-body text-mca-ink-muted">
            Aggregated signals across collectors — set flags on catalog-linked cards from any card detail
            modal.
          </p>
          <Link
            href="/matching"
            className="mt-mca-md inline-block text-sm font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            ← Matching
          </Link>
        </header>
        <MarketV3ReadonlyPanel />
        <MarketEnginePanel />
        <MarketAutoMatchPanel />
        <MarketOffersPanel currentUserId={user.id} />
        <MarketWatchlistPanel />
        <MarketDiscoveryClient />
      </div>
    </AuthenticatedPresenceShell>
  );
}
