"use client";

export type DashboardMetric = {
  label: string;
  value: number;
  event?: string;
};

export type DashboardConfig = {
  id: string;
  title: string;
  description?: string;
  metrics: DashboardMetric[];
};

export function AdminChartPanel({ config }: { config: DashboardConfig }) {
  const max = Math.max(...config.metrics.map((m) => m.value), 1);
  return (
    <section className="rounded-mca-lg border border-mca-border bg-mca-surface-raised p-mca-lg">
      <h2 className="text-mca-lg font-semibold text-mca-ink-strong">{config.title}</h2>
      {config.description ? (
        <p className="mt-mca-micro text-mca-sm text-mca-ink-muted">{config.description}</p>
      ) : null}
      <ul className="mt-mca-md space-y-mca-sm" role="list">
        {config.metrics.map((m) => (
          <li key={m.label}>
            <div className="flex items-center justify-between text-mca-sm">
              <span className="text-mca-ink-muted">{m.label}</span>
              <span className="font-mono text-mca-ink-strong">{m.value}</span>
            </div>
            <div
              className="mt-mca-micro h-2 rounded-full bg-mca-chrome/60"
              role="presentation"
            >
              <div
                className="h-2 rounded-full bg-mca-accent/80 transition-all duration-200 ease-mca-standard"
                style={{ width: `${Math.round((m.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
