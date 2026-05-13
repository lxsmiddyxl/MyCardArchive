import { HotPathTracker } from "@/components/perf/hot-path-tracker";
import { NotificationsListClient } from "@/components/notifications/notifications-list-client";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { SuspenseFallbackMarker } from "@/lib/telemetry";
import { createClient } from "@/lib/supabase/server";
import { MCAErrorBoundary } from "@/mca-ui/error-boundary";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your MyCardArchive notifications.",
};

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/notifications"));
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[12rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 px-mca-md text-mca-body text-mca-ink-subtle">
          <SuspenseFallbackMarker name="notifications-panel" />
          Loading…
        </div>
      }
    >
      <HotPathTracker pathId="hp:notifications:list" />
      <SurfaceMountTelemetry name="notifications-page" surfaceName="notifications-panel" />
      <MCAErrorBoundary
        componentName="NotificationsListClient"
        surfaceName="notifications-panel"
        title="Notifications unavailable"
      >
        <NotificationsListClient />
      </MCAErrorBoundary>
    </Suspense>
  );
}
