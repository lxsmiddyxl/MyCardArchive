import { CatalogCardSearchClient } from "@/components/catalog/catalog-card-search-client";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Search cards · Catalog",
};

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return (v[0] ?? "").trim();
  return (v ?? "").trim();
}

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function CatalogCardSearchPage({ searchParams }: PageProps) {
  const scopedSetId = firstParam(searchParams?.set_id);

  return (
    <div className="space-y-mca-section">
      <SurfaceMountTelemetry name="catalog-card-search-page" surfaceName="catalog" />
      <header className="space-y-mca-compact">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
          Pokémon TCG
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          Catalog · Search cards
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Find cards across all synced sets, or narrow results to one expansion. Matches use fuzzy
          search on card names, numbers, and set titles.
        </p>
        <nav className="flex flex-wrap gap-mca-md pt-mca-sm text-sm">
          <Link
            href="/catalog"
            className="font-medium text-mca-ink-muted transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            ← All sets
          </Link>
        </nav>
      </header>
      <CatalogCardSearchClient initialSetId={scopedSetId} />
    </div>
  );
}
