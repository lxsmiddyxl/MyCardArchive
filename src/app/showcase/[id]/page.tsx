import { mcaLog } from "@/lib/logging/mca-log-server";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const CTX = { componentName: "showcase/[id]", surfaceName: "creator" } as const;

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: "Showcase" };
}

export default async function ShowcaseDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl(`/showcase/${encodeURIComponent(params.id)}`));
  }

  const { data, error } = await supabase
    .from("collection_showcases")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  await supabase.rpc("increment_showcase_views", { p_showcase_id: params.id });

  mcaLog.event(
    "creator.showcase.view",
    { showcaseId: params.id, ownerId: data.user_id, viewerId: user.id },
    CTX
  );

  const featured: string[] = Array.isArray(data.featured_card_ids)
    ? (data.featured_card_ids as string[])
    : [];
  if (featured.length > 0) {
    mcaLog.event(
      "creator.showcase.featured",
      { showcaseId: params.id, featuredCount: featured.length },
      CTX
    );
  }

  return (
    <article className="space-y-mca-lg">
      <p className="mca-typo-label">
        <Link href="/showcase" className="text-mca-accent hover:underline">
          Showcases
        </Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">{data.title}</h1>
      {data.description ? (
        <p className="max-w-prose whitespace-pre-wrap text-mca-body text-mca-ink-muted">{data.description}</p>
      ) : null}
      <section className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 p-mca-lg">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-mca-ink-subtle">Binders</h2>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          {Array.isArray(data.binder_ids) && data.binder_ids.length > 0
            ? `${data.binder_ids.length} binder(s) linked — open each from your collection.`
            : "No binders linked yet. Edit this showcase from the API or a future editor."}
        </p>
        <ul className="mt-mca-md font-mono text-xs text-mca-ink-subtle">
          {(data.binder_ids as string[]).map((id) => (
            <li key={id}>
              <Link href={`/binders/${id}`} className="text-mca-accent hover:underline">
                {id}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {featured.length > 0 ? (
        <section className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 p-mca-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-mca-ink-subtle">
            Featured cards
          </h2>
          <ul className="mt-mca-md font-mono text-xs text-mca-ink-subtle">
            {featured.map((cid) => (
              <li key={cid}>
                <Link href={`/cards/${cid}`} className="text-mca-accent hover:underline">
                  {cid}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
