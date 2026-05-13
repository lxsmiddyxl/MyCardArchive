import "./globals.css";
import type { Metadata } from "next";
import { AchievementToastProvider } from "@/components/achievement-toast-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { TopNav } from "@/components/layout/top-nav";
import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { InstallAppCta } from "@/components/pwa/install-app-cta";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { GrowthShell } from "@/components/growth/growth-shell";
import { A11yEnvironmentTelemetry } from "@/components/system/a11y-environment-telemetry";
import { RootClientBoundary } from "@/components/system/root-client-boundary";
import { RealtimeStatusBanner } from "@/components/system/realtime-status-banner";
import { SkipToContent } from "@/components/system/skip-to-content";
import { ensureProfileAndPublic } from "@/lib/supabase/ensureProfile";
import { createClient } from "@/lib/supabase/server";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "@/styles/achievements.css";

/**
 * Opt-in dev chrome (realtime panel, health overlay, auth debug strip). Default off so `next dev`
 * stays minimal — set `NEXT_PUBLIC_MCA_DEV_UI=1` in `.env.local` when you need MCA tooling.
 */
const MCA_DEV_UI =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_MCA_DEV_UI === "1";

/** Dev-only chunk: production build resolves to a no-op stub so the overlay module is not bundled. */
const RealtimeDevtools: ComponentType =
  MCA_DEV_UI
    ? dynamic(
        () => import("@/components/dev/realtime-devtools").then((m) => m.RealtimeDevtools),
        { ssr: false }
      )
    : function RealtimeDevtoolsProductionStub() {
        return null;
      };

const DebugAuthBannerSlot: ComponentType =
  MCA_DEV_UI
    ? dynamic(
        () =>
          import("@/components/dev/debug-auth-banner").then((m) => m.DebugAuthBanner),
        { ssr: false }
      )
    : function DebugAuthBannerStub() {
        return null;
      };

/** Dev / optional staging: health overlay; production without NEXT_PUBLIC_STABILITY_MODE resolves to a stub. */
const McaHealthOverlay: ComponentType =
  MCA_DEV_UI || process.env.NEXT_PUBLIC_STABILITY_MODE === "1"
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

const inter = Inter({ subsets: ["latin"], display: "swap", adjustFontFallback: true });

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
        className={`${inter.className} flex min-h-screen min-h-[100dvh] flex-col !bg-mca-surface !text-mca-ink-strong antialiased`}
      >
        <SkipToContent />
        <DebugAuthBannerSlot />
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
          <main
            id="mca-main-content"
            className="mca-main-min-h mx-auto max-w-6xl min-w-0 flex-1 overflow-x-hidden px-mca-base py-mca-md max-md:pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:px-mca-lg md:pb-mca-md"
          >
            <RootClientBoundary>
              <MobileAppShell>{children}</MobileAppShell>
            </RootClientBoundary>
          </main>
          <SiteFooter />
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
