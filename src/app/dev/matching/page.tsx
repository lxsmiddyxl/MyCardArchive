import { MatchingInspectorClient } from "@/app/dev/matching/matching-inspector-client";
import { notFound } from "next/navigation";

export default function DevMatchingPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-mca-base px-mca-base py-mca-xl">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Dev</p>
        <h1 className="text-mca-display text-mca-ink-strong">Matching engine</h1>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          Inspect Phase 2 scoring fields. Live lists include compatibility, collection overlap, and trade
          potential — see <code className="text-mca-accent/90">src/lib/matching/scoring.ts</code>.
        </p>
      </div>
      <MatchingInspectorClient />
    </div>
  );
}
