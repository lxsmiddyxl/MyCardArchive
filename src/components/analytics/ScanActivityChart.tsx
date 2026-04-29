import { mcaSemantic } from "@/styles/tokens";

export type ScanActivityChartProps = {
  monthly_scan_activity: Record<string, number>;
  title?: string;
};

function sortedMonths(m: Record<string, number>): { key: string; count: number }[] {
  try {
    if (!m || typeof m !== "object") return [];
    return Object.entries(m)
      .map(([key, count]) => ({
        key: String(key),
        count: typeof count === "number" && Number.isFinite(count) ? count : 0,
      }))
      .filter((e) => e.count >= 0)
      .sort((a, b) => a.key.localeCompare(b.key));
  } catch {
    return [];
  }
}

export function ScanActivityChart({
  monthly_scan_activity,
  title = "Monthly scan activity",
}: ScanActivityChartProps) {
  const series = sortedMonths(monthly_scan_activity ?? {});
  const max = Math.max(...series.map((s) => s.count), 1);

  const label = (ym: string) => {
    try {
      const [y, mo] = ym.split("-");
      if (!y || !mo) return ym;
      const d = new Date(Date.UTC(Number(y), Number(mo) - 1, 1));
      return d.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return ym;
    }
  };

  return (
    <section className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-comfortable shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle">
      <h2 className="mca-section-reveal text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle">
        {title}
      </h2>
      {series.length === 0 ? (
        <p className="mt-mca-base text-sm text-mca-ink-subtle transition-opacity duration-200 ease-mca-standard">
          No scan history in range — capture cards on the Scan page.
        </p>
      ) : (
        <div className="mca-chart-reveal mt-mca-base overflow-x-auto">
          <svg
            viewBox={`0 0 ${Math.max(280, series.length * 36)} 120`}
            className="h-32 w-full min-w-[280px]"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={title}
            focusable="false"
          >
            {series.map((s, i) => {
              const barW = 24;
              const gap = 12;
              const x = 8 + i * (barW + gap);
              const h = Math.max(4, (s.count / max) * 80);
              const y = 100 - h;
              return (
                <g key={s.key}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    rx={4}
                    fill="rgba(245, 158, 11, 0.78)"
                  />
                  <text
                    x={x + barW / 2}
                    y={112}
                    textAnchor="middle"
                    fill="#737373"
                    fontSize={8}
                  >
                    {label(s.key)}
                  </text>
                  {s.count > 0 ? (
                    <text
                      x={x + barW / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fill={mcaSemantic.chartValue}
                      fontSize={9}
                    >
                      {s.count}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
