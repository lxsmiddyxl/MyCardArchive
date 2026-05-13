import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import Link from "next/link";

type CatalogSet = Database["public"]["Tables"]["catalog_sets"]["Row"];

export default async function CatalogIndexPage() {
  const supabase = createClient();
  const { data: sets, error } = await supabase
    .from("catalog_sets")
    .select("*")
    .order("release_date", { ascending: false, nullsFirst: false });

  const list = (sets ?? []) as CatalogSet[];

  if (error) {
    logServerError({ scope: "ssr", route: "/catalog", err: error });
  }

  return (
    <div className="space-y-mca-section">
      <SurfaceMountTelemetry name="catalog-index" surfaceName="catalog" />
      <header className="space-y-mca-compact">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
          Pokémon TCG
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
          Catalog · Sets
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Browse synced sets from the Pokémon TCG API cache. Run sync from
          POST <span className="font-mono text-xs">/api/catalog/sync/sets</span>{" "}
          (service role required on the server).
        </p>
        <p className="pt-mca-sm">
          <Link
            href="/catalog/cards/search"
            className="text-sm font-semibold text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Search cards in the catalog →
          </Link>
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-mca-card border border-mca-warning-surface-border/60 bg-mca-warning-surface/30 px-mca-base py-mca-compact text-sm text-mca-nav-accent"
        >
          Could not load sets: {error.message}
        </p>
      ) : null}

      {!error && list.length === 0 ? (
        <div className="rounded-mca-sheet border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 px-mca-xl py-mca-jumbo text-center">
          <p className="text-mca-ink-body">No sets in the catalog yet.</p>
          <p className="mt-mca-sm text-sm text-mca-ink-subtle">
            Configure <code className="text-mca-ink-muted">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            and trigger a sync.
          </p>
        </div>
      ) : null}

      {!error && list.length > 0 ? (
        <ul className="grid grid-cols-1 gap-mca-base sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                href={`/catalog/${encodeURIComponent(s.id)}`}
                aria-label={`View set ${s.name}`}
                className="flex h-full gap-mca-base rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 p-mca-comfortable shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45)] transition-all duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-surface-elevated/70"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-mca-card border border-mca-border bg-mca-surface">
                  {s.symbol_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.symbol_url}
                      alt=""
                      aria-hidden
                      className="max-h-10 max-w-10 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-mca-hint">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-mca-ink-strong">{s.name}</h2>
                  <p className="mt-mca-xs text-xs text-mca-ink-subtle">
                    {s.series}
                    {s.set_code ? ` · ${s.set_code}` : null}
                    {s.release_year != null ? ` · ${s.release_year}` : null}
                    {s.release_date && s.release_year == null
                      ? ` · ${s.release_date}`
                      : null}
                    {s.publisher ? ` · ${s.publisher}` : null}
                  </p>
                  <p className="mt-mca-xs font-mono text-[10px] text-mca-hint">
                    {s.id}
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
