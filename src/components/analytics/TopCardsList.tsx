import type { TopCardEntry } from "@/lib/analytics/types";
import Link from "next/link";

export type TopCardsListProps = {
  top_cards: TopCardEntry[];
};

function formatUsd(n: number): string {
  try {
    if (!Number.isFinite(n) || n <= 0) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n > 0 ? `${n.toFixed(2)} USD` : "—";
  }
}

export function TopCardsList({ top_cards }: TopCardsListProps) {
  const list = Array.isArray(top_cards) ? top_cards : [];

  return (
    <section className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-comfortable shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle">
      <h2 className="mca-section-reveal text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle">
        Highest-value cards
      </h2>
      {list.length === 0 ? (
        <p className="mt-mca-md text-sm text-mca-ink-subtle transition-opacity duration-200 ease-mca-standard">
          No priced cards yet — refresh prices on card pages after catalog
          quotes exist.
        </p>
      ) : (
        <ul className="mca-chart-reveal mt-mca-md divide-y divide-mca-border/80">
          {list.map((c) => (
            <li key={c.card_id} className="flex gap-mca-compact py-mca-compact transition-opacity duration-200 ease-mca-standard first:pt-0">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded-mca-block border border-mca-border bg-mca-surface">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[8px] uppercase text-mca-hint">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/binders/${c.binder_id}`}
                  className="font-medium text-mca-ink-strong transition hover:text-mca-accent"
                >
                  {c.name || "—"}
                </Link>
                <p className="mt-mca-trace font-mono text-xs text-mca-ink-subtle">
                  #{c.number ?? "—"}
                  {c.rarity ? ` · ${c.rarity}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-mca-accent-highlight/90">
                {formatUsd(c.estimated_value_usd)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
