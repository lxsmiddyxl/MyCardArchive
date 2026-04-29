import { HotPathTracker } from "@/components/perf/hot-path-tracker";
import { TradeDetailClient } from "@/components/trading/trade-detail-client";
import { SuspenseFallbackMarker } from "@/lib/telemetry";
import { createClient } from "@/lib/supabase/server";
import { MCAErrorBoundary } from "@/mca-ui/error-boundary";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Props = { params: { tradeId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Trade ${params.tradeId.slice(0, 12)}…`,
  };
}

export default async function TradeDetailPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/trades/${encodeURIComponent(params.tradeId)}`);
  }

  const tradeId = typeof params.tradeId === "string" ? params.tradeId.trim() : "";
  if (!tradeId) {
    redirect("/trades");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[12rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 px-mca-md text-mca-body text-mca-ink-subtle">
          <SuspenseFallbackMarker name="trade-detail" />
          Loading trade…
        </div>
      }
    >
      <HotPathTracker pathId="hp:trade:detail" />
      <MCAErrorBoundary
        componentName="TradeDetailClient"
        surfaceName="trade-detail"
        traceId={tradeId}
        title="Trade view unavailable"
      >
        <TradeDetailClient tradeId={tradeId} currentUserId={user.id} />
      </MCAErrorBoundary>
    </Suspense>
  );
}
