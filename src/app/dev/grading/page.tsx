import { GradingDriftInspectorClient } from "@/app/dev/grading/grading-drift-inspector-client";
import { GradingInspectorClient } from "@/app/dev/grading/grading-inspector-client";
import { notFound } from "next/navigation";

export default function DevGradingPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-mca-base px-mca-base py-mca-xl">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Dev</p>
        <h1 className="text-mca-display text-mca-ink-strong">Grading pipeline</h1>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          Inspect the model-ready envelope, JSON input contract, and heuristic fallback. Production cards use{" "}
          <code className="text-mca-accent/90">GET/POST /api/cards/[id]/grade</code>.
        </p>
      </div>
      <GradingDriftInspectorClient />
      <GradingInspectorClient />
    </div>
  );
}
