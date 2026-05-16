"use client";

import { EmptyStateShowcase } from "@/mca-ui/empty-states/EmptyStateShowcase";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";

export type ShowcaseItem = {
  id: string;
  binder_id: string | null;
  group_id: string | null;
  position: number;
  binder_name: string | null;
  group_title: string | null;
  share_url: string | null;
};

export type ProfileShowcaseProps = {
  items: ShowcaseItem[];
  showEmpty?: boolean;
};

export function ProfileShowcase({ items, showEmpty }: ProfileShowcaseProps) {
  if (!items.length) {
    return showEmpty ? <EmptyStateShowcase /> : null;
  }

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Showcase</h2>
      <div className="grid gap-mca-md sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const label = item.binder_name ?? item.group_title ?? "Featured";
          if (!item.share_url) return <div key={item.id}>{label}</div>;
          return (
            <Link
              key={item.id}
              href={item.share_url}
              className="rounded-mca-card border border-mca-accent-border/30 bg-mca-accent-border/10 p-mca-compact text-sm font-medium transition duration-200 ease-mca-standard hover:border-mca-accent-border/50"
            >
              {label}
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
