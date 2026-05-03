import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MyCardArchive handles personal data and telemetry.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-mca-xl pb-mca-2xl pt-mca-sm">
      <SurfaceMountTelemetry name="legal-privacy" surfaceName="legal" />
      <header className="space-y-mca-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">Legal</p>
        <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong">Privacy Policy</h1>
        <p className="text-sm text-mca-ink-muted">
          Summary for launch preparation. Replace with counsel-reviewed policy before public marketing.
        </p>
      </header>

      <div className="space-y-mca-lg text-mca-body leading-relaxed text-mca-ink-body">
        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Data we collect</h2>
          <p>
          We process account information (e.g. email), profile and collection data you choose to store, images you
          submit for scanning, and operational telemetry needed to run and secure the app. We do not sell your personal
          information.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Cookies & similar technologies</h2>
          <p>
          We use cookies and local storage for session authentication (e.g. Supabase), preferences, and optional PWA
          behavior. Analytics and error telemetry are designed to avoid collecting unnecessary personal details; do not
          paste secrets into support forms.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Telemetry</h2>
          <p>
          We may log anonymized usage and error events to improve reliability. Logs are not used for advertising
          profiling in-product.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Third parties</h2>
          <p>
          Infrastructure providers (e.g. hosting, database, payments) process data under their terms when you use those
          features. Payment card data is handled by our payment processor, not stored on our servers.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Your choices</h2>
          <p>
          You may update profile settings, request account deletion subject to legal retention needs, and contact us via{" "}
          <Link href="/support" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
            Support
          </Link>
          .
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Terms</h2>
          <p>
          Use of the service is also governed by our{" "}
          <Link href="/legal/terms" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
            Terms of Service
          </Link>
          .
        </p>
        </section>
      </div>
    </div>
  );
}
