import { HotPathTracker } from "@/components/perf/hot-path-tracker";
import { ActivityLogClient } from "@/components/notifications/activity-log-client";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { SuspenseFallbackMarker } from "@/lib/telemetry";
import { createClient } from "@/lib/supabase/server";
import { MCAErrorBoundary } from "@/mca-ui/error-boundary";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Activity",
  description: "Your MyCardArchive activity log.",
};

export default async function ActivityPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/activity");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[12rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 px-mca-md text-mca-body text-mca-ink-subtle">
          <SuspenseFallbackMarker name="activity-log" />
          Loading…
        </div>
      }
    >
      <HotPathTracker pathId="hp:activity:feed" />
      <SurfaceMountTelemetry name="activity-page" surfaceName="activity-log" />
      <MCAErrorBoundary
        componentName="ActivityLogClient"
        surfaceName="activity-log"
        title="Activity log unavailable"
      >
        <ActivityLogClient />
      </MCAErrorBoundary>
    </Suspense>
  );
}
