import { getBinderAnalytics } from "@/lib/analytics/get-binder-analytics";
import { AnalyticsSummary } from "@/components/analytics/AnalyticsSummary";
import { RarityChart } from "@/components/analytics/RarityChart";
import { RecentScansList } from "@/components/analytics/RecentScansList";
import { ScanActivityChart } from "@/components/analytics/ScanActivityChart";
import { SetChart } from "@/components/analytics/SetChart";
import { TopCardsList } from "@/components/analytics/TopCardsList";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: { binderId: string };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return { title: "Binder analytics" };
    }

    const { data: binder } = await supabase
      .from("binders")
      .select("name")
      .eq("id", params.binderId)
      .eq("user_id", user.id)
      .maybeSingle();

    const name = binder?.name;
    return {
      title: name ? `Analytics · ${name}` : "Binder analytics",
    };
  } catch {
    return { title: "Binder analytics" };
  }
}

export default async function BinderAnalyticsPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=/binders/${encodeURIComponent(params.binderId)}/analytics`
    );
  }

  const { data: binder, error: binderError } = await supabase
    .from("binders")
    .select("id, user_id, name")
    .eq("id", params.binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (binderError || !binder) {
    notFound();
  }

  let data: Awaited<ReturnType<typeof getBinderAnalytics>>;
  try {
    data = await getBinderAnalytics(supabase, binder.id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-mca-2xl">
      <div className="space-y-mca-base">
        <Link
          href={`/binders/${binder.id}`}
          className="inline-flex text-sm font-medium text-mca-ink-muted transition hover:text-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent"
        >
          ← {binder.name}
        </Link>
        <header className="space-y-mca-compact">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
            Binder analytics
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
            {binder.name}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
            Rarity and set estimates from your cards and scans; values use
            cached market prices (USD) with the same provider priority as
            pricing refresh.
          </p>
        </header>
      </div>

      <div className="space-y-mca-section">
        <AnalyticsSummary summary={data.summary} />
        <div className="grid gap-mca-lg lg:grid-cols-2">
          <RarityChart rarity_breakdown={data.rarity_breakdown} />
          <SetChart
            set_breakdown={data.set_breakdown}
            title="Set breakdown (from scans)"
          />
        </div>
        <div className="grid gap-mca-lg lg:grid-cols-2">
          <TopCardsList top_cards={data.top_cards} />
          <RecentScansList recent_scans={data.recent_scans} />
        </div>
        <ScanActivityChart
          monthly_scan_activity={data.monthly_scan_activity}
          title="Monthly scans (this binder)"
        />
      </div>
    </div>
  );
}
