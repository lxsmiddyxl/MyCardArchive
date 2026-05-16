import { PublicBinderSlots, type PublicBinderSlotCard } from "@/components/binders/public-binder-slots";
import { resolveBinderAccent } from "@/lib/binders/binder-accent";
import type { BinderInsights } from "@/mca-utils/binders/binder-insights-types";
import { BinderOverviewPanel } from "@/mca-ui/binder/BinderOverviewPanel";
import Link from "next/link";

export type BinderEmbedProps = {
  binderId: string;
  name: string;
  description: string | null;
  ownerDisplay: string;
  insights: BinderInsights | null;
  previewSlots: PublicBinderSlotCard[];
};

export function BinderEmbed({
  binderId,
  name,
  description,
  ownerDisplay,
  insights,
  previewSlots,
}: BinderEmbedProps) {
  const accent = resolveBinderAccent(binderId);
  const overview = insights?.overview ?? {
    binder_id: binderId,
    name,
    description,
    created_at: new Date(0).toISOString(),
    updated_at: null,
    total_cards: 0,
    unique_catalog_cards: 0,
    sets_represented: 0,
  };

  return (
    <div className="mca-embed-root mx-auto max-w-lg space-y-mca-md p-mca-base">
      <header className="space-y-mca-xs border-b border-mca-border/60 pb-mca-md">
        <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-subtle">Binder</p>
        <h1 className="text-xl font-semibold text-mca-ink-strong">{name}</h1>
        {description ? <p className="text-sm text-mca-ink-muted">{description}</p> : null}
        <p className="text-xs text-mca-ink-subtle">by {ownerDisplay}</p>
      </header>

      <BinderOverviewPanel overview={overview} accent={accent} />

      <section aria-label="Page 1 preview">
        <p className="mb-mca-sm text-xs font-medium text-mca-ink-subtle">Page 1</p>
        <PublicBinderSlots page={0} slots={previewSlots} />
      </section>

      <footer className="pt-mca-sm">
        <Link
          href={`/b/${binderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-mca-control bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent transition duration-200 ease-mca-standard hover:bg-mca-accent"
        >
          View on MyCardArchive
        </Link>
      </footer>
    </div>
  );
}
