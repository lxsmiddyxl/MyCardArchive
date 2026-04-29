import { ReportIssuePanel } from "@/components/support/report-issue-panel";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { NavBackLink } from "@/mca-ui";
import Link from "next/link";

export const metadata = {
  title: "Support",
};

export default function SupportPage() {
  return (
    <div className="space-y-mca-xl pt-mca-sm">
      <SurfaceMountTelemetry name="support-page" surfaceName="support" />
      <NavBackLink href="/feed">← Feed</NavBackLink>
      <header className="space-y-mca-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">Help</p>
        <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong">
          Report an issue
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Something broken, confusing, or slow? Grab the diagnostics below and send them with a short
          description of what you expected versus what happened.
        </p>
      </header>

      <ReportIssuePanel />

      <p className="text-sm text-mca-ink-subtle">
        Billing receipts and invoices live in{" "}
        <Link href="/billing/history" className="font-medium text-mca-accent-strong/90 hover:underline">
          Billing history
        </Link>
        <span className="text-mca-hint"> (Stripe portal).</span>
      </p>
    </div>
  );
}
