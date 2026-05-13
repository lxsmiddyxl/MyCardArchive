import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { WelcomeLaunchClient } from "./welcome-client";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Getting started",
  description: "Optional setup: profile, binders, and follows.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/welcome"));
  }

  return (
    <div className="mx-auto max-w-2xl pb-mca-2xl pt-mca-sm">
      <SurfaceMountTelemetry name="welcome-page" surfaceName="onboarding.welcome" />
      <WelcomeLaunchClient />
    </div>
  );
}
