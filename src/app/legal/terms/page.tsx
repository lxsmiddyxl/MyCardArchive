import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of MyCardArchive.",
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-mca-xl pb-mca-2xl pt-mca-sm">
      <SurfaceMountTelemetry name="legal-terms" surfaceName="legal" />
      <header className="space-y-mca-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">Legal</p>
        <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong">Terms of Service</h1>
        <p className="text-sm text-mca-ink-muted">
          Last updated for launch preparation. Replace with counsel-reviewed terms before public marketing.
        </p>
      </header>

      <div className="space-y-mca-lg text-mca-body leading-relaxed text-mca-ink-body">
        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Agreement</h2>
          <p>
          By accessing MyCardArchive you agree to these terms and our{" "}
          <Link href="/legal/privacy" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the service.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Service</h2>
          <p>
          MyCardArchive provides tools to catalog cards, manage binders and decks, scan images, and participate in
          community and trading features. Features and limits may change; material changes will be communicated in-app or
          by email where appropriate.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Accounts & conduct</h2>
          <p>
          You are responsible for your account and for content you upload or post. Harassment, fraud, illegal activity,
          or attempts to disrupt the service are prohibited. We may suspend or terminate accounts that violate these
          terms or pose risk to other users.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Disclaimers</h2>
          <p>
          The service is provided &quot;as is.&quot; Card values, recognition output, and third-party data are
          informational and may be inaccurate. Nothing on MyCardArchive is financial or investment advice.
        </p>
        </section>

        <section className="space-y-mca-sm">
          <h2 className="text-mca-h3 font-semibold text-mca-ink-strong">Contact</h2>
          <p>
          Questions: use{" "}
          <Link href="/support" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
            Support
          </Link>
          .
        </p>
        </section>
      </div>
    </div>
  );
}
