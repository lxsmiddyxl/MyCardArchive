"use client";

import { extractApiPayload } from "@/lib/client";
import { ExploreActivityFeed } from "@/mca-ui/explore/ExploreActivityFeed";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useEffect, useState } from "react";

type ExploreBinder = {
  id: string;
  name: string;
  description: string | null;
  share_url: string;
  owner_display: string;
  owner_handle: string | null;
  updated_at: string;
};

type ExplorePayload = {
  trending: ExploreBinder[];
  recently_updated: ExploreBinder[];
};

function BinderCard({ binder }: { binder: ExploreBinder }) {
  return (
    <Link
      href={binder.share_url}
      className="block rounded-mca-card border border-mca-border-subtle/80 bg-mca-surface/40 p-mca-compact transition duration-200 ease-mca-standard hover:border-mca-accent-border/40 hover:bg-mca-chrome/40"
    >
      <p className="font-semibold text-mca-ink-body">{binder.name}</p>
      {binder.description ? (
        <p className="mt-mca-xs line-clamp-2 text-sm text-mca-ink-muted">{binder.description}</p>
      ) : null}
      <p className="mt-mca-sm text-xs text-mca-ink-subtle">
        {binder.owner_handle ? `@${binder.owner_handle}` : binder.owner_display}
      </p>
    </Link>
  );
}

export function BinderExplorePage() {
  const [data, setData] = useState<ExplorePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/explore/binders", { cache: "no-store" });
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) {
        setError("Could not load explore binders.");
        return;
      }
      setData(payload as ExplorePayload);
    })();
  }, []);

  if (error) {
    return <p className="text-sm text-mca-error-text">{error}</p>;
  }

  return (
    <div className="space-y-mca-section">
      <header>
        <p className="mca-typo-label">Explore</p>
        <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink">
          Public binders
        </h1>
        <p className="mt-mca-sm max-w-2xl text-sm text-mca-ink-muted">
          Discover binders shared by collectors across MCA.
        </p>
      </header>

      <Panel className="space-y-mca-md">
        <h2 className="text-sm font-semibold text-mca-ink-body">Trending</h2>
        <div className="grid gap-mca-md sm:grid-cols-2 lg:grid-cols-3">
          {(data?.trending ?? []).map((b) => (
            <BinderCard key={`t-${b.id}`} binder={b} />
          ))}
        </div>
        {!data?.trending?.length ? (
          <p className="text-sm text-mca-ink-muted">No public binders yet.</p>
        ) : null}
      </Panel>

      <Panel className="space-y-mca-md">
        <h2 className="text-sm font-semibold text-mca-ink-body">Recently updated</h2>
        <div className="grid gap-mca-md sm:grid-cols-2 lg:grid-cols-3">
          {(data?.recently_updated ?? []).map((b) => (
            <BinderCard key={`r-${b.id}`} binder={b} />
          ))}
        </div>
      </Panel>

      <ExploreActivityFeed />
    </div>
  );
}
