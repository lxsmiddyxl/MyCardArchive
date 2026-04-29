import type { TierCompareFeatureRow } from "@/lib/tier/tier-compare-data";
import { cn } from "@/lib/ui/cn";

type Props = {
  rows: TierCompareFeatureRow[];
  currentSlug: string;
};

type CompareCol = "free" | "pro" | "elite" | "business";

function colHighlight(slug: string, col: CompareCol): string {
  const s = slug.toLowerCase();
  if (col === "free" && (s === "free" || !s)) {
    return "ring-1 ring-mca-focus/40 bg-mca-surface-elevated/90";
  }
  if (col === "pro" && s === "pro") return "ring-1 ring-mca-focus/40 bg-mca-surface-elevated/90";
  if (col === "elite" && s === "elite") {
    return "ring-1 ring-mca-focus/40 bg-mca-surface-elevated/90";
  }
  if (col === "business" && s === "business") {
    return "ring-1 ring-mca-focus/40 bg-mca-surface-elevated/90";
  }
  return "";
}

function CompareCellView({ cell }: { cell: TierCompareFeatureRow["free"] }) {
  if (cell.kind === "dash") {
    return (
      <span className="text-mca-ink-subtle tabular-nums" aria-label="Not included">
        —
      </span>
    );
  }
  if (cell.kind === "check") {
    return (
      <span className="inline-flex items-center gap-mca-xs text-mca-ink-body">
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-mca-accent-strong/20 text-xs font-bold text-mca-accent"
          aria-hidden
        >
          ✓
        </span>
        {cell.label ? (
          <span className="text-mca-caption text-mca-ink-muted">{cell.label}</span>
        ) : null}
      </span>
    );
  }
  if (cell.kind === "badge") {
    return (
      <span className="inline-flex rounded-full border border-mca-border-subtle bg-mca-chrome/50 px-mca-sm py-mca-trace text-mca-caption font-medium text-mca-ink-muted">
        {cell.value}
      </span>
    );
  }
  return <span className="text-mca-ink-muted">{cell.value}</span>;
}

/**
 * Full-feature comparison grid with checks, dashes, and badges — scrollable on narrow viewports.
 */
export function TierCompareFeatureTable({ rows, currentSlug }: Props) {
  return (
    <div className="overflow-x-auto rounded-mca-block border border-mca-border bg-mca-surface-elevated/60 shadow-mca-panel dark:border-mca-border-subtle">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm md:min-w-[52rem]">
        <caption className="sr-only">
          Compare Free, Pro, Elite, and Business plans: scans, capture tools, storage, and profile perks.
        </caption>
        <thead>
          <tr className="border-b border-mca-border bg-mca-chrome/40 text-mca-caption uppercase tracking-wide text-mca-ink-subtle">
            <th scope="col" className="px-mca-md py-mca-sm font-semibold">
              Feature
            </th>
            <th scope="col" className="px-mca-md py-mca-sm font-semibold">
              Free
            </th>
            <th scope="col" className="px-mca-md py-mca-sm font-semibold">
              Pro
            </th>
            <th scope="col" className="px-mca-md py-mca-sm font-semibold">
              Elite
            </th>
            <th scope="col" className="px-mca-md py-mca-sm font-semibold">
              Business
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.feature}
              className="border-b border-mca-border/70 last:border-b-0 odd:bg-mca-surface/30"
            >
              <th
                scope="row"
                className="px-mca-md py-mca-compact font-medium text-mca-ink-body"
              >
                {row.feature}
              </th>
              <td
                className={cn(
                  "px-mca-md py-mca-compact align-top",
                  colHighlight(currentSlug, "free")
                )}
              >
                <CompareCellView cell={row.free} />
              </td>
              <td
                className={cn(
                  "px-mca-md py-mca-compact align-top",
                  colHighlight(currentSlug, "pro")
                )}
              >
                <CompareCellView cell={row.pro} />
              </td>
              <td
                className={cn(
                  "px-mca-md py-mca-compact align-top",
                  colHighlight(currentSlug, "elite")
                )}
              >
                <CompareCellView cell={row.elite} />
              </td>
              <td
                className={cn(
                  "px-mca-md py-mca-compact align-top",
                  colHighlight(currentSlug, "business")
                )}
              >
                <CompareCellView cell={row.business} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
