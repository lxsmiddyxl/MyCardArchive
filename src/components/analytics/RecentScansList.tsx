import type { RecentScanEntry } from "@/lib/analytics/types";

export type RecentScansListProps = {
  recent_scans: RecentScanEntry[];
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function RecentScansList({ recent_scans }: RecentScansListProps) {
  const list = Array.isArray(recent_scans) ? recent_scans : [];

  return (
    <section className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-comfortable shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle">
      <h2 className="mca-section-reveal text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle">
        Recent scans
      </h2>
      {list.length === 0 ? (
        <p className="mt-mca-md text-sm text-mca-ink-subtle transition-opacity duration-200 ease-mca-standard">
          No linked scans in this view yet.
        </p>
      ) : (
        <ul className="mca-chart-reveal mt-mca-md divide-y divide-mca-border/80">
          {list.map((s) => (
            <li key={s.id} className="py-mca-compact transition-opacity duration-200 ease-mca-standard first:pt-0">
              <p className="text-sm text-mca-ink-soft">
                {s.summary ?? "Scan"}
              </p>
              <p className="mt-mca-xs text-xs text-mca-ink-subtle">
                {formatWhen(s.created_at)}
                {s.card_id ? (
                  <span className="ms-mca-sm font-mono text-mca-hint">
                    card {s.card_id.slice(0, 8)}…
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
