import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: { setId: string } };

type CatalogSet = Database["public"]["Tables"]["catalog_sets"]["Row"];
type CatalogCard = Database["public"]["Tables"]["catalog_cards"]["Row"];

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: setRow } = await supabase
    .from("catalog_sets")
    .select("name")
    .eq("id", params.setId)
    .maybeSingle();

  const n = setRow?.name;
  return { title: n ? `${n} · Catalog` : "Set · Catalog" };
}

export default async function CatalogSetPage({ params }: PageProps) {
  const supabase = createClient();
  const setId = params.setId?.trim();
  if (!setId) {
    notFound();
  }

  const { data: setRow, error: setErr } = await supabase
    .from("catalog_sets")
    .select("*")
    .eq("id", setId)
    .maybeSingle();

  if (setErr) {
    logServerError({ scope: "ssr", route: "/catalog/[setId]", err: setErr });
  }
  if (setErr || !setRow) {
    notFound();
  }

  const s = setRow as CatalogSet;

  const { data: cardsRaw, error: cardErr } = await supabase
    .from("catalog_cards")
    .select("*")
    .eq("set_id", setId)
    .order("number", { ascending: true });

  if (cardErr) {
    logServerError({ scope: "ssr", route: "/catalog/[setId]", err: cardErr });
  }

  const cards = (cardsRaw ?? []) as CatalogCard[];

  return (
    <div className="space-y-mca-section">
      <SurfaceMountTelemetry name="catalog-set-page" surfaceName="catalog" />
      <div className="space-y-mca-base">
        <Link
          href="/catalog"
          className="inline-flex text-sm font-medium text-mca-ink-muted transition hover:text-mca-accent"
        >
          ← All sets
        </Link>

        <header className="flex flex-wrap items-start gap-mca-lg border-b border-mca-border/80 pb-mca-xl">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-mca-sheet border border-mca-border bg-mca-surface p-mca-sm">
            {s.logo_url ? (
              <Image
                src={s.logo_url}
                alt=""
                width={80}
                height={80}
                className="max-h-full max-w-full object-contain"
                unoptimized
              />
            ) : s.symbol_url ? (
              <Image
                src={s.symbol_url}
                alt=""
                width={48}
                height={48}
                className="max-h-12 max-w-12 object-contain"
                unoptimized
              />
            ) : (
              <span className="text-mca-hint">—</span>
            )}
          </div>
          <div className="min-w-0 space-y-mca-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
              {s.series}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
              {s.name}
            </h1>
            <p className="text-sm text-mca-ink-subtle">
              {s.release_date ? `Released ${s.release_date}` : null}
              {s.printed_total != null ? ` · ${s.printed_total} printed` : ""}
            </p>
            <p className="font-mono text-xs text-mca-hint">{s.id}</p>
          </div>
        </header>
      </div>

      {cardErr ? (
        <p className="rounded-mca-card border border-mca-warning-surface-border/60 bg-mca-warning-surface/30 px-mca-base py-mca-compact text-sm text-mca-nav-accent">
          Could not load cards: {cardErr.message}
        </p>
      ) : null}

      {!cardErr && cards.length === 0 ? (
        <p className="text-sm text-mca-ink-subtle">
          No cards for this set. Sync cards via POST{" "}
          <code className="text-mca-ink-muted">/api/catalog/sync/cards/{s.id}</code>.
        </p>
      ) : null}

      {!cardErr && cards.length > 0 ? (
        <ul className="grid grid-cols-2 gap-mca-base sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <li key={c.id}>
              <Link
                href={`/catalog/cards/${encodeURIComponent(c.id)}`}
                className="group block overflow-hidden rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 transition hover:border-mca-field-border hover:bg-mca-surface-elevated/70"
              >
                <div className="aspect-[63/88] bg-gradient-to-b from-mca-chrome/60 to-mca-surface">
                  {c.image_small || c.image_large ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_small ?? c.image_large ?? ""}
                      alt=""
                      className="h-full w-full object-contain p-mca-sm transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-mca-hint">
                      No art
                    </div>
                  )}
                </div>
                <div className="border-t border-mca-border/80 p-mca-compact">
                  <p className="truncate text-sm font-medium text-mca-ink-strong">
                    {c.name}
                  </p>
                  <p className="mt-mca-trace font-mono text-xs text-mca-ink-subtle">
                    #{c.number}
                    {c.rarity ? ` · ${c.rarity}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
