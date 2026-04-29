import { TierEmblem } from "@/components/tier/tier-emblem";
import type { TierAuraKey } from "@/lib/tier/tier-emblem-meta";

export type TierCatalogShowcaseRow = {
  tierSlug: string;
  codename: string;
  description: string;
  /** When two rows share a strip (e.g. Apex / Nova), set explicit alt for a11y. */
  emblemAlt?: string;
  /** Distinct aura + tooltip when slug duplicates (e.g. Apex on `elite`). */
  auraKey?: TierAuraKey;
};

export function TierCatalogShowcase({
  rows,
  id = "tier-emblems-heading",
}: {
  rows: TierCatalogShowcaseRow[];
  id?: string;
}) {
  return (
    <section
      className="space-y-mca-md rounded-mca-block border border-mca-border bg-mca-surface-elevated/60 p-mca-lg dark:border-mca-border-subtle sm:p-mca-xl"
      aria-labelledby={id}
    >
      <div>
        <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Tier emblems
        </h2>
        <p className="mt-mca-xs max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Each plan maps to a horizontal strip. Codenames Ember, Spark, Nova, and Apex reflect early tier
          naming; live slugs in the app are <span className="font-mono text-mca-ink-soft">free</span>,{" "}
          <span className="font-mono text-mca-ink-soft">pro</span>, and{" "}
          <span className="font-mono text-mca-ink-soft">elite</span>.
        </p>
      </div>
      <ul className="grid list-none gap-mca-lg p-0 sm:grid-cols-2">
        {rows.map((row, i) => (
          <li
            key={`${row.tierSlug}-${row.codename}-${i}`}
            className="flex flex-col gap-mca-md rounded-mca-block border border-mca-border/80 bg-mca-surface/80 p-mca-md shadow-mca-panel dark:border-mca-border-subtle/80"
          >
            <TierEmblem
              tierSlug={row.tierSlug}
              variant="catalog"
              alt={row.emblemAlt ?? row.codename}
              auraKey={row.auraKey}
            />
            <div className="space-y-mca-xs">
              <h3 className="text-lg font-semibold tracking-tight text-mca-ink-strong">{row.codename}</h3>
              <p className="text-sm leading-relaxed text-mca-ink-muted">{row.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
