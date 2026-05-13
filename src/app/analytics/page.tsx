import { getCollectionAnalytics } from "@/lib/analytics/get-collection-analytics";
import type { AnalyticsResult } from "@/lib/analytics/types";
import { AnalyticsSummary } from "@/components/analytics/AnalyticsSummary";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { RarityChart } from "@/components/analytics/RarityChart";
import { RecentScansList } from "@/components/analytics/RecentScansList";
import { ScanActivityChart } from "@/components/analytics/ScanActivityChart";
import { SetChart } from "@/components/analytics/SetChart";
import { TopCardsList } from "@/components/analytics/TopCardsList";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Collection analytics",
};

export default async function CollectionAnalyticsPage() {
  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    redirect(authSignInUrl("/analytics"));
  }

  if (!user) {
    redirect(authSignInUrl("/analytics"));
  }

  let data: AnalyticsResult;
  try {
    data = await getCollectionAnalytics(supabase);
  } catch (err) {
    logServerError({ scope: "ssr", route: "/analytics", userId: user.id, err });
    return (
      <div className="rounded-mca-block border border-mca-warning-surface-border/40 bg-mca-warning-surface/20 px-mca-base py-mca-xl text-center">
        <p className="text-sm font-medium text-mca-nav-accent">
          Could not load analytics. Try again later.
        </p>
        <Link
          href="/feed"
          className="mt-mca-base inline-block text-sm font-medium text-mca-accent underline-offset-2 hover:underline"
        >
          Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-mca-2xl">
      <SurfaceMountTelemetry name="analytics-page" surfaceName="analytics" />
      <div className="space-y-mca-base">
        <Link
          href="/feed"
          className="inline-flex rounded-mca-control text-sm font-medium text-mca-ink-muted transition-all duration-200 ease-mca-standard hover:text-mca-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
        >
          ← Feed
        </Link>
        <header className="space-y-mca-compact">
          <p className="mca-section-reveal text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Analytics
          </p>
          <h1 className="mca-section-reveal mca-section-reveal-delay-1 text-2xl font-semibold tracking-tight text-mca-ink-strong sm:text-3xl">
            Collection analytics
          </h1>
          <p className="mca-section-reveal mca-section-reveal-delay-2 max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
            Everything in your account: rarity mix, sets (from scans or binder
            names), estimated value from stored prices, and scan activity.
          </p>
        </header>
      </div>

      <div className="space-y-mca-section">
        <AnalyticsSummary summary={data.summary} />
        <div className="grid gap-mca-lg lg:grid-cols-2">
          <RarityChart rarity_breakdown={data.rarity_breakdown} />
          <SetChart
            set_breakdown={data.set_breakdown}
            title="Set / binder breakdown"
          />
        </div>
        <div className="grid gap-mca-lg lg:grid-cols-2">
          <TopCardsList top_cards={data.top_cards} />
          <RecentScansList recent_scans={data.recent_scans} />
        </div>
        <ScanActivityChart
          monthly_scan_activity={data.monthly_scan_activity}
          title="Monthly scan activity (all scans)"
        />
      </div>
    </div>
  );
}
