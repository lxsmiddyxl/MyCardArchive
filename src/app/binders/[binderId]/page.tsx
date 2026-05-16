import { BinderHomeBase } from "@/components/binders/binder-home-base";
import { BinderFtue } from "@/components/binders/binder-ftue";
import { BinderPaperBackdrop } from "@/components/artwork/artwork-surfaces";
import { BinderTitleWithRings } from "@/components/artwork/binder-title-artwork";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { Breadcrumb, NavBackLink } from "@/mca-ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const BinderBookLazy = dynamicImport(
  () =>
    import("@/components/binders/binder-book").then((m) => ({
      default: m.BinderBook,
    })),
  {
    loading: () => (
      <div className="flex min-h-48 items-center justify-center rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/30 px-mca-md text-mca-body text-mca-ink-subtle">
        Loading binder…
      </div>
    ),
  }
);

type BinderDetailRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type PageProps = {
  params: { binderId: string };
};

function formatCreatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function resolveBinderId(params: PageProps["params"]): string {
  const raw = params?.binderId;
  return typeof raw === "string" ? raw.trim() : "";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const binderId = resolveBinderId(params);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!binderId || !user) {
      return { title: "Binder" };
    }

    const { data: binder } = await supabase
      .from("binders")
      .select("name")
      .eq("id", binderId)
      .eq("user_id", user.id)
      .maybeSingle();

    return {
      title: binder?.name ? `${binder.name}` : "Binder",
    };
  } catch {
    return { title: "Binder" };
  }
}

export default async function BinderDetailPage({ params }: PageProps) {
  const binderId = resolveBinderId(params);

  let user: { id: string } | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    user = null;
  }

  if (!user) {
    const next =
      binderId.length > 0
        ? `/binders/${encodeURIComponent(binderId)}`
        : "/binders";
    redirect(authSignInUrl(next));
  }

  if (!binderId) {
    return (
      <div className="space-y-mca-xl">
        <NavBackLink href="/binders">← All binders</NavBackLink>
        <div className="rounded-mca-sheet border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 px-mca-xl py-mca-stage text-center">
          <h1 className="text-lg font-medium text-mca-ink-soft">Binder not found</h1>
          <p className="mt-mca-sm text-sm text-mca-ink-subtle">
            The link may be invalid or incomplete.
          </p>
          <Link
            href="/binders"
            className="mt-mca-xl inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome"
          >
            Back to binders
          </Link>
        </div>
      </div>
    );
  }

  let binder: BinderDetailRow | null = null;
  let binderError: Error | null = null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("binders")
      .select("id, user_id, name, description, created_at")
      .eq("id", binderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) binderError = new Error(error.message);
    else if (data) binder = data as BinderDetailRow;
  } catch (e) {
    logServerError({
      scope: "ssr",
      route: "/binders/[binderId]",
      userId: user.id,
      err: e,
    });
    binderError = e instanceof Error ? e : new Error("Failed to load binder");
  }

  if (binderError || !binder) {
    return (
      <div className="space-y-mca-xl">
        <NavBackLink href="/binders">← All binders</NavBackLink>
        <div className="rounded-mca-sheet border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 px-mca-xl py-mca-stage text-center">
          <h1 className="text-lg font-medium text-mca-ink-soft">Binder not found</h1>
          <p className="mt-mca-sm max-w-md text-sm text-mca-ink-subtle">
            {binderError
              ? `Could not load this binder: ${binderError.message}`
              : "This binder does not exist or you do not have access to it."}
          </p>
          <Link
            href="/binders"
            className="mt-mca-xl inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome"
          >
            Back to binders
          </Link>
        </div>
      </div>
    );
  }

  const b = binder;

  return (
    <BinderPaperBackdrop>
    <div className="space-y-mca-section">
      <NavBackLink href="/binders">← All binders</NavBackLink>
      <Breadcrumb
        items={[{ label: "Binders", href: "/binders" }, { label: b.name }]}
        className="mt-mca-xs"
      />

      <div className="flex flex-col gap-mca-lg border-b border-mca-border/80 pb-mca-xl lg:flex-row lg:items-start lg:justify-between">
        <header className="space-y-mca-base">
          <BinderTitleWithRings>
            <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
              {b.name}
            </h1>
          </BinderTitleWithRings>
          {b.description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
              {b.description}
            </p>
          ) : null}
          <p className="text-sm text-mca-ink-muted">
            <span className="text-mca-ink-subtle">Created </span>
            <span className="font-medium text-mca-ink-body">
              {formatCreatedAt(b.created_at)}
            </span>
          </p>
        </header>
        <div className="flex shrink-0 flex-col gap-mca-sm sm:flex-row sm:items-center lg:items-end lg:pt-mca-xs">
          <Link
            href={`/binders/${b.id}/analytics`}
            className="inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome"
          >
            Analytics
          </Link>
          <Link
            href={`/binders/${b.id}/pages`}
            className="inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome"
          >
            Page view
          </Link>
          <Link
            href={`/binders/${b.id}/settings`}
            className="inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition hover:border-mca-border-interactive hover:bg-mca-chrome"
          >
            Sharing
          </Link>
          <Link
            href={`/binders/${b.id}/add-card`}
            className="inline-flex items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent"
          >
            Add card
          </Link>
        </div>
      </div>

      <BinderHomeBase binderId={b.id} />

      <section aria-labelledby="binder-grid-heading">
        <h2
          id="binder-grid-heading"
          className="mb-mca-base text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle"
        >
          Binder pages
        </h2>
        <Suspense
          fallback={
            <div className="flex min-h-48 items-center justify-center rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/30 px-mca-md text-mca-body text-mca-ink-subtle">
              Loading binder grid…
            </div>
          }
        >
          <BinderBookLazy binderId={b.id} />
        </Suspense>
      </section>
      <BinderFtue />
    </div>
    </BinderPaperBackdrop>
  );
}
