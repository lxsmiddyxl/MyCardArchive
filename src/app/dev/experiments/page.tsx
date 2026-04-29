import { ExperimentsDevPanel } from "@/components/dev/experiments-dev-panel";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Experiments (dev)",
};

export default async function DevExperimentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dev/experiments");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-mca-xl px-mca-md py-mca-xl">
      <SurfaceMountTelemetry name="dev-experiments" surfaceName="experiments" />
      <header>
        <p className="mca-typo-label">Developer tools</p>
        <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink">Experiments & flags</h1>
        <p className="mt-mca-md text-mca-body text-mca-ink-muted">
          Deterministic bucket assignment and environment feature flags. See{" "}
          <code className="font-mono text-sm">docs/EXPERIMENTS.md</code> and{" "}
          <code className="font-mono text-sm">docs/FEATURE_FLAGS.md</code>.
        </p>
        <Link
          href="/dev/telemetry"
          className="mt-mca-md inline-block text-sm font-medium text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
        >
          ← Dev telemetry
        </Link>
      </header>
      <ExperimentsDevPanel />
    </div>
  );
}
