import { FeedInspectorClient } from "@/app/dev/feed/feed-inspector-client";
import { notFound } from "next/navigation";

export default function DevFeedPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-mca-base px-mca-base py-mca-xl">
      <div>
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Dev</p>
        <h1 className="text-mca-display text-mca-ink-strong">Feed ranking inspector</h1>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          Phase 82 feed ranking: hybrid (Phase 77) plus engagement prediction, affinity, and freshness decay. SQL feed:{" "}
          <code className="text-mca-accent/90">get_global_feed_v3</code> adds identity trait overlap, presence proximity, and archetype
          cluster fusion. Production: <code className="text-mca-accent/90">GET /api/feed</code> (omit{" "}
          <code className="text-mca-accent/90">debug=1</code> to strip ranking payloads).
        </p>
      </div>
      <FeedInspectorClient />
    </div>
  );
}
