import { CatalogCardArtworkPanel } from "@/components/artwork/catalog-card-artwork-panel";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: { cardId: string } };

type CatalogCard = Database["public"]["Tables"]["catalog_cards"]["Row"];
type CatalogSet = Database["public"]["Tables"]["catalog_sets"]["Row"];

type CardWithSet = CatalogCard & { catalog_sets: CatalogSet | null };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("catalog_cards")
    .select("name")
    .eq("id", params.cardId)
    .maybeSingle();

  const n = data?.name;
  return { title: n ? `${n} · Catalog` : "Card · Catalog" };
}

export default async function CatalogCardDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const cardId = params.cardId?.trim();
  if (!cardId) {
    notFound();
  }

  const { data: raw, error } = await supabase
    .from("catalog_cards")
    .select("*, catalog_sets(*)")
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    logServerError({ scope: "ssr", route: "/catalog/cards/[cardId]", err: error });
  }
  if (error || !raw) {
    notFound();
  }

  const row = raw as CardWithSet;
  const st = row.catalog_sets;

  return (
    <div className="space-y-mca-section">
      <SurfaceMountTelemetry name="catalog-card-page" surfaceName="catalog" />
      <div className="space-y-mca-base">
        {st?.id ? (
          <Link
            href={`/catalog/${encodeURIComponent(st.id)}`}
            className="inline-flex text-sm font-medium text-mca-ink-muted transition hover:text-mca-accent"
          >
            ← {st.name}
          </Link>
        ) : (
          <Link
            href="/catalog"
            className="inline-flex text-sm font-medium text-mca-ink-muted transition hover:text-mca-accent"
          >
            ← Catalog
          </Link>
        )}
      </div>

      <div className="grid gap-mca-section lg:grid-cols-2 lg:gap-mca-2xl">
        <CatalogCardArtworkPanel>
          {row.image_large || row.image_small ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.image_large ?? row.image_small ?? ""}
              alt=""
              className="max-h-[480px] w-full max-w-md object-contain"
            />
          ) : (
            <p className="text-mca-hint">No image</p>
          )}
        </CatalogCardArtworkPanel>

        <div className="space-y-mca-lg">
          <header className="space-y-mca-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
              {row.supertype ?? "Card"}
              {row.subtypes?.length
                ? ` · ${row.subtypes.join(", ")}`
                : ""}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
              {row.name}
            </h1>
            <p className="text-sm text-mca-ink-muted">
              {st?.name ? `${st.name} · ` : ""}
              <span className="font-mono">#{row.number}</span>
              {row.rarity ? ` · ${row.rarity}` : ""}
            </p>
            <p className="font-mono text-xs text-mca-hint">{row.id}</p>
          </header>

          <dl className="space-y-mca-compact rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 p-mca-comfortable text-sm">
            <div className="flex justify-between gap-mca-base border-b border-mca-border/80 py-mca-sm first:pt-0">
              <dt className="text-mca-ink-subtle">Set id</dt>
              <dd className="text-right font-mono text-mca-ink-body">
                {row.set_id}
              </dd>
            </div>
            {st?.release_date ? (
              <div className="flex justify-between gap-mca-base border-b border-mca-border/80 py-mca-sm">
                <dt className="text-mca-ink-subtle">Release</dt>
                <dd className="text-mca-ink-body">{st.release_date}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-mca-base py-mca-sm last:pb-0">
              <dt className="text-mca-ink-subtle">Small image</dt>
              <dd className="max-w-[55%] truncate text-right text-mca-accent-strong/85">
                {row.image_small ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
