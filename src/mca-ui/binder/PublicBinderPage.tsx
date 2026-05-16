"use client";

import { BinderDistributionPanel } from "@/mca-ui/binder/BinderDistributionPanel";
import { BinderOverviewPanel } from "@/mca-ui/binder/BinderOverviewPanel";
import { BinderSetProgressList } from "@/mca-ui/binder/BinderSetProgressList";
import { BinderActivityFeed } from "@/mca-ui/binder/BinderActivityFeed";
import { BinderComments } from "@/mca-ui/binder/BinderComments";
import { BinderReactions } from "@/mca-ui/binder/BinderReactions";
import { BinderPresenceBar } from "@/mca-ui/binder/BinderPresenceBar";
import { BinderSubscribeButton } from "@/mca-ui/binder/BinderSubscribeButton";
import { resolveBinderAccent } from "@/lib/binders/binder-accent";
import type { BinderVisibility } from "@/lib/binders/binder-social-types";
import type { BinderInsights } from "@/mca-utils/binders/binder-insights-types";
import Link from "next/link";

export type PublicBinderPageProps = {
  binderId: string;
  name: string;
  description: string | null;
  visibility: BinderVisibility;
  ownerDisplay: string;
  ownerHandle: string | null;
  insights: BinderInsights | null;
  canInteract: boolean;
  subscriberCount: number;
  initialSubscribed: boolean;
  canSubscribe: boolean;
};

export function PublicBinderPage({
  binderId,
  name,
  description,
  ownerDisplay,
  ownerHandle,
  insights,
  canInteract,
  subscriberCount,
  initialSubscribed,
  canSubscribe,
}: PublicBinderPageProps) {
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
    <div className="space-y-mca-section">
      <header className="space-y-mca-sm border-b border-mca-border/80 pb-mca-lg">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle">
          Public binder
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong">{name}</h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">{description}</p>
        ) : null}
        <p className="text-sm text-mca-ink-muted">
          by{" "}
          {ownerHandle ? (
            <Link
              href={`/u/${encodeURIComponent(ownerHandle)}`}
              className="font-medium text-mca-accent-strong/90 hover:underline"
            >
              {ownerDisplay}
            </Link>
          ) : (
            <span className="font-medium text-mca-ink-body">{ownerDisplay}</span>
          )}
        </p>
        <BinderPresenceBar binderId={binderId} mode="viewing" enabled={canInteract} />
        <p className="text-sm text-mca-ink-muted">
          <span className="font-medium text-mca-ink-body">{subscriberCount}</span> subscribers
        </p>
        {canSubscribe ? (
          <BinderSubscribeButton
            binderId={binderId}
            initialSubscribed={initialSubscribed}
            canSubscribe={canSubscribe}
          />
        ) : null}
        <div className="flex flex-wrap gap-mca-sm pt-mca-xs">
          <Link
            href={`/binders/${binderId}/missing`}
            className="inline-flex items-center justify-center rounded-mca-card border border-mca-field-border bg-mca-surface-elevated/50 px-mca-comfortable py-mca-tight text-sm font-medium text-mca-ink-soft transition duration-200 ease-mca-standard hover:border-mca-border-interactive hover:bg-mca-chrome"
          >
            Missing cards
          </Link>
        </div>
      </header>

      <BinderOverviewPanel overview={overview} accent={accent} />
      <BinderDistributionPanel
        rarity_distribution={
          insights?.rarity_distribution ?? {
            common: 0,
            uncommon: 0,
            rare: 0,
            ultra: 0,
            secret: 0,
            other: 0,
          }
        }
        variant_distribution={
          insights?.variant_distribution ?? {
            standard: 0,
            holo: 0,
            reverse: 0,
            promo: 0,
            alt_art: 0,
            other: 0,
          }
        }
        duplicate_count={insights?.duplicate_count ?? 0}
        total_variants={insights?.total_variants ?? 0}
        accent={accent}
        loading={!insights}
      />
      <BinderSetProgressList
        binderId={binderId}
        sets={insights?.sets ?? []}
        accent={accent}
        loading={!insights}
      />

      <div className="grid gap-mca-lg lg:grid-cols-2">
        <BinderReactions binderId={binderId} canReact={canInteract} />
        <BinderComments binderId={binderId} canPost={canInteract} />
      </div>
      <BinderActivityFeed binderId={binderId} limit={8} />
    </div>
  );
}
