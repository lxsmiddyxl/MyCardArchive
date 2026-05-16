"use client";

import { Panel } from "@/mca-ui/panel";
import Link from "next/link";

export type BinderGroupPageProps = {
  title: string;
  description: string | null;
  coverUrl: string | null;
  ownerDisplay: string;
  ownerHandle: string | null;
  binders: Array<{ id: string; name: string; share_url: string }>;
};

export function BinderGroupPage({
  title,
  description,
  coverUrl,
  ownerDisplay,
  ownerHandle,
  binders,
}: BinderGroupPageProps) {
  return (
    <div className="space-y-mca-section">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="h-40 w-full rounded-mca-card object-cover" />
      ) : null}
      <header>
        <p className="text-xs uppercase tracking-wide text-mca-ink-subtle">Binder group</p>
        <h1 className="text-3xl font-semibold text-mca-ink-strong">{title}</h1>
        {description ? <p className="mt-mca-sm text-sm text-mca-ink-muted">{description}</p> : null}
        <p className="mt-mca-sm text-sm text-mca-ink-muted">
          by{" "}
          {ownerHandle ? (
            <Link href={`/u/${ownerHandle}`} className="text-mca-accent-strong/90 hover:underline">
              {ownerDisplay}
            </Link>
          ) : (
            ownerDisplay
          )}
        </p>
      </header>
      <Panel className="grid gap-mca-md sm:grid-cols-2">
        {binders.map((b) => (
          <Link
            key={b.id}
            href={b.share_url}
            className="rounded-mca-card border border-mca-border-subtle/80 p-mca-compact transition duration-200 ease-mca-standard hover:border-mca-accent-border/40"
          >
            {b.name}
          </Link>
        ))}
      </Panel>
    </div>
  );
}
