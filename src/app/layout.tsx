import "./globals.css";
import type { Metadata } from "next";
import { DebugAuthBanner } from "@/components/dev/debug-auth-banner";
import { AchievementToastProvider } from "@/components/achievement-toast-provider";
import { TopNav } from "@/components/layout/top-nav";
import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { InstallAppCta } from "@/components/pwa/install-app-cta";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { GrowthShell } from "@/components/growth/growth-shell";
import { A11yEnvironmentTelemetry } from "@/components/system/a11y-environment-telemetry";
import { RealtimeStatusBanner } from "@/components/system/realtime-status-banner";
import { ensureProfileAndPublic } from "@/lib/supabase/ensureProfile";
import { createClient } from "@/lib/supabase/server";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "@/styles/achievements.css";

/** Dev-only chunk: production build resolves to a no-op stub so the overlay module is not bundled. */
const RealtimeDevtools: ComponentType =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () => import("@/components/dev/realtime-devtools").then((m) => m.RealtimeDevtools),
        { ssr: false }
      )
    : function RealtimeDevtoolsProductionStub() {
        return null;
      };

/** Dev / optional staging: health overlay; production without NEXT_PUBLIC_STABILITY_MODE resolves to a stub. */
const McaHealthOverlay: ComponentType =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
    ? dynamic(
        () =>
          import("@/components/devtools/mca-health-overlay").then((m) => m.McaHealthOverlay),
        { ssr: false }
      )
    : function McaHealthOverlayProductionStub() {
        return null;
      };

/** Staging: recovery attempt overlay (NEXT_PUBLIC_STABILITY_MODE only). */
const McaRecoveryOverlay: ComponentType =
  process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
    ? dynamic(
        () =>
          import("@/components/devtools/mca-recovery-overlay").then((m) => m.McaRecoveryOverlay),
        { ssr: false }
      )
    : function McaRecoveryOverlayStub() {
        return null;
      };

/** Staging: region health + failover snapshot (NEXT_PUBLIC_STABILITY_MODE only). */
const McaRegionOverlay: ComponentType =
  process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
    ? dynamic(
        () =>
          import("@/components/devtools/mca-region-overlay").then((m) => m.McaRegionOverlay),
        { ssr: false }
      )
    : function McaRegionOverlayStub() {
        return null;
      };

/** Staging: predictive diagnostics (NEXT_PUBLIC_STABILITY_MODE only). */
const McaPredictiveOverlay: ComponentType =
  process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
    ? dynamic(
        () =>
          import("@/components/devtools/mca-predictive-overlay").then((m) => m.McaPredictiveOverlay),
        { ssr: false }
      )
    : function McaPredictiveOverlayStub() {
        return null;
      };

/** Staging: load shedding + degradation (NEXT_PUBLIC_STABILITY_MODE only). */
const McaLoadOverlay: ComponentType =
  process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
    ? dynamic(
        () => import("@/components/devtools/mca-load-overlay").then((m) => m.McaLoadOverlay),
        { ssr: false }
      )
    : function McaLoadOverlayStub() {
        return null;
      };

/** Staging: hot path + cache latency overlay (NEXT_PUBLIC_STABILITY_MODE only). */
const McaPerfOverlay: ComponentType =
  process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
    ? dynamic(
        () => import("@/components/devtools/mca-perf-overlay").then((m) => m.McaPerfOverlay),
        { ssr: false }
      )
    : function McaPerfOverlayStub() {
        return null;
      };

const inter = Inter({ subsets: ["latin"] });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MyCardArchive",
    template: "%s · MyCardArchive",
  },
  description:
    "Collect, organize, and scan trading cards with binders and tier limits.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let navUser: { email: string | null; id: string } | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        await ensureProfileAndPublic(supabase, user);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[layout] ensureProfileAndPublic failed", err);
        }
      }
      navUser = { email: user.email ?? null, id: user.id };
    }
  } catch {
    navUser = null;
  }

  return (
    <html lang="en" className="dark bg-mca-surface">
      <body
        className={`${inter.className} min-h-screen !bg-mca-surface !text-mca-ink-strong antialiased`}
      >
        <DebugAuthBanner />
        <AchievementToastProvider>
          <PwaRegister />
          <InstallAppCta />
          <GrowthShell />
          <A11yEnvironmentTelemetry />
          <header className="sticky top-0 z-50 min-h-[3.5rem] border-b border-mca-border bg-mca-surface/90 backdrop-blur-md shadow-mca-panel shadow-black/20">
            <div className="mx-auto flex min-h-[3.5rem] max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-mca-base py-mca-sm sm:px-mca-lg">
              <TopNav user={navUser} />
            </div>
          </header>
          <RealtimeStatusBanner />
          <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-6xl px-mca-base py-mca-md max-md:pb-mca-stage sm:px-mca-lg md:pb-mca-md">
            <MobileAppShell>{children}</MobileAppShell>
          </main>
          <RealtimeDevtools />
          <McaHealthOverlay />
          <McaRecoveryOverlay />
          <McaRegionOverlay />
          <McaPredictiveOverlay />
          <McaLoadOverlay />
          <McaPerfOverlay />
        </AchievementToastProvider>
      </body>
    </html>
  );
}
