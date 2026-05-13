import { MatchingDashboardClient } from "@/components/matching/matching-dashboard-client";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { SuspenseFallbackMarker } from "@/lib/telemetry";
import { createClient } from "@/lib/supabase/server";
import { MCAErrorBoundary } from "@/mca-ui/error-boundary";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Matching",
  description: "Discover trainers whose want and have lists overlap with yours.",
};

export default async function MatchingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/matching"));
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[12rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 px-mca-md text-mca-body text-mca-ink-subtle">
          <SuspenseFallbackMarker name="matching-dashboard" />
          Loading matching…
        </div>
      }
    >
      <MCAErrorBoundary
        componentName="MatchingDashboardClient"
        surfaceName="matching"
        title="Matching unavailable"
      >
        <MatchingDashboardClient userId={user.id} />
      </MCAErrorBoundary>
    </Suspense>
  );
}
