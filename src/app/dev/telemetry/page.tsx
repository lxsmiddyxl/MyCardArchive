import { TelemetryDashboardClient } from "@/app/dev/telemetry/telemetry-dashboard-client";
import { notFound } from "next/navigation";

export default function DevTelemetryPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-mca-base px-mca-base py-mca-xl">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Dev</p>
        <h1 className="text-mca-display text-mca-ink-strong">Telemetry</h1>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          In-memory aggregates (auto-refresh every 5s). Production uses{" "}
          <code className="text-mca-accent/90">x-internal-telemetry-secret</code>. Set{" "}
          <code className="text-mca-accent/90">TELEMETRY_INGEST_DISABLED</code> to degrade telemetry
          checks (health/diagnostics) during incidents.
        </p>
      </div>
      <TelemetryDashboardClient />
    </div>
  );
}
