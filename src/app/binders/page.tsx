import { BinderPaperBackdrop } from "@/components/artwork/artwork-surfaces";
import { BinderTitleWithRings } from "@/components/artwork/binder-title-artwork";
import { HotPathTracker } from "@/components/perf/hot-path-tracker";
import { BinderShelfReveal } from "@/components/binders/binder-shelf-reveal";
import { BinderShelfCard } from "@/components/binders/binder-shelf-card";
import { TierFeatureGateBadge } from "@/components/tier/tier-feature-gate-badge";
import {
  getBinderCount,
  getEffectiveUserTier,
} from "@/lib/tier/check-limits";
import { isBusinessTier } from "@/lib/tier/scan-tier-policy";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Your Binders",
};

type BinderListRow = {
  id: string;
  name: string;
  created_at: string;
};

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BindersPage() {
  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    redirect("/login?next=/binders");
  }

  if (!user) {
    redirect("/login?next=/binders");
  }

  const [tier, binderCount, bindersResult] = await Promise.all([
    getEffectiveUserTier(supabase),
    getBinderCount(supabase),
    supabase
      .from("binders")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const { data: bindersRaw, error } = bindersResult;

  const binders = (bindersRaw ?? []) as BinderListRow[];

  /** Align with `assertCanCreateBinder`: unlimited when `binder_limit <= 0`. */
  const atBinderLimit =
    tier != null &&
    tier.binder_limit > 0 &&
    binderCount >= tier.binder_limit;

  const canExportCsv = tier != null && isBusinessTier(tier);

  const counts: Record<string, number> = {};
  if (binders.length > 0) {
    const ids = binders.map((b) => b.id);
    const { data: cardRows } = await supabase
      .from("cards")
      .select("binder_id")
      .eq("user_id", user.id)
      .in("binder_id", ids);

    for (const row of cardRows ?? []) {
      const bid = row.binder_id as string;
      counts[bid] = (counts[bid] ?? 0) + 1;
    }
  }

  const createClassName = atBinderLimit
    ? "pointer-events-none inline-flex w-full cursor-not-allowed items-center justify-center rounded-mca-card border border-mca-border-subtle bg-mca-chrome/50 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-ink-subtle sm:w-auto"
    : "inline-flex w-full items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent hover:shadow-[0_8px_28px_-6px_rgba(245,158,11,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent sm:w-auto";

  return (
    <BinderPaperBackdrop>
    <div className="space-y-mca-2xl">
      <HotPathTracker pathId="hp:collection:listViewport" />
      <div className="flex flex-col gap-mca-base sm:flex-row sm:items-start sm:justify-between">
        <BinderTitleWithRings>
          <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
            Your Binders
          </h1>
        </BinderTitleWithRings>
        <div className="flex w-full flex-col items-stretch gap-mca-sm sm:w-auto sm:items-end">
          {binders.length > 0 ? (
            canExportCsv ? (
              <a
                href="/api/inventory/csv"
                className="inline-flex w-full items-center justify-center rounded-mca-card border border-mca-violet-border/50 bg-mca-violet-surface/20 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-violet-text transition hover:bg-mca-violet-surface/30 sm:w-auto"
              >
                Export collection (CSV)
              </a>
            ) : (
              <span className="inline-flex w-full flex-wrap items-center justify-center gap-mca-xs rounded-mca-card border border-mca-border-subtle bg-mca-chrome/40 px-mca-comfortable py-mca-tight text-sm text-mca-ink-muted sm:w-auto sm:justify-end">
                <span>Export collection (CSV)</span>
                <TierFeatureGateBadge kind="business" />
              </span>
            )
          ) : null}
          {atBinderLimit ? (
            <span className={createClassName} aria-disabled="true">
              Create Binder
            </span>
          ) : (
            <Link href="/binders/create" className={createClassName}>
              Create Binder
            </Link>
          )}
        </div>
      </div>

      {atBinderLimit ? (
        <p className="rounded-mca-card border border-mca-warning-surface-border/50 bg-mca-warning-surface/25 px-mca-base py-mca-compact text-sm text-mca-warning-tint">
          You&apos;ve reached your binder limit.
          <Link
            href="/tier"
            className="ms-mca-xs font-semibold text-mca-accent underline-offset-2 hover:underline"
          >
            View plans and upgrade
          </Link>
          .
        </p>
      ) : null}

      {error ? (
        <p className="rounded-mca-card border border-mca-warning-surface-border/60 bg-mca-warning-surface/30 px-mca-base py-mca-compact text-sm text-mca-nav-accent">
          {error.message}
        </p>
      ) : null}

      {!error && binders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-mca-sheet border border-dashed border-mca-border-subtle bg-mca-surface-elevated/30 px-mca-xl py-mca-stage text-center">
          <p className="text-lg font-medium text-mca-ink-soft">No binders yet</p>
          <p className="mt-mca-sm max-w-sm text-sm leading-relaxed text-mca-ink-subtle">
            Create your first binder to start a shelf—then add pages, drop cards into slots, and open any
            card for details or grading.
          </p>
          {atBinderLimit ? (
            <p className="mt-mca-lg max-w-sm text-sm text-mca-nav-accent/90">
              You&apos;ve reached your binder limit.{" "}
              <Link
                href="/tier"
                className="font-semibold text-mca-accent underline-offset-2 hover:underline"
              >
                Upgrade on the Tier page
              </Link>{" "}
              to add more.
            </p>
          ) : (
            <Link
              href="/binders/create"
              className="mt-mca-xl inline-flex items-center justify-center rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)] transition hover:bg-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent"
            >
              Create Binder
            </Link>
          )}
        </div>
      ) : null}

      {!error && binders.length > 0 ? (
        <BinderShelfReveal>
          <ul className="grid gap-mca-lg sm:grid-cols-2 xl:grid-cols-3">
            {binders.map((binder) => (
              <BinderShelfCard
                key={binder.id}
                id={binder.id}
                name={binder.name}
                cardCount={counts[binder.id] ?? 0}
                createdLabel={formatCreatedAt(binder.created_at)}
              />
            ))}
          </ul>
        </BinderShelfReveal>
      ) : null}
    </div>
    </BinderPaperBackdrop>
  );
}
