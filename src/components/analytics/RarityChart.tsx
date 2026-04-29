export type RarityChartProps = {
  rarity_breakdown: Record<string, number>;
  title?: string;
};

function entriesFromMap(m: Record<string, number>): { label: string; count: number }[] {
  try {
    if (!m || typeof m !== "object") return [];
    return Object.entries(m)
      .map(([label, count]) => ({
        label: String(label),
        count: typeof count === "number" && Number.isFinite(count) ? count : 0,
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

export function RarityChart({
  rarity_breakdown,
  title = "Rarity breakdown",
}: RarityChartProps) {
  const entries = entriesFromMap(rarity_breakdown ?? {});
  const max = Math.max(...entries.map((e) => e.count), 1);

  return (
    <section className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-comfortable shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle">
      <h2 className="mca-section-reveal text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle">
        {title}
      </h2>
      {entries.length === 0 ? (
        <p className="mt-mca-md text-sm text-mca-ink-subtle transition-opacity duration-200 ease-mca-standard">
          No rarity data yet — add cards with a rarity field.
        </p>
      ) : (
        <ul className="mca-chart-reveal mt-mca-md space-y-mca-compact" aria-label={title}>
          {entries.map((e) => (
            <li key={e.label} className="space-y-mca-xs">
              <div className="flex justify-between gap-mca-sm text-xs">
                <span className="truncate text-mca-ink-body">{e.label}</span>
                <span className="shrink-0 tabular-nums text-mca-ink-subtle">
                  {e.count}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-mca-chrome"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-mca-accent-strong/80 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ width: `${Math.min(100, (e.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
