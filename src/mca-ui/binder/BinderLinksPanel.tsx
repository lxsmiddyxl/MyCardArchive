"use client";

import { extractApiPayload } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LinkRow = {
  id: string;
  label: string;
  target_binder_id: string;
  target_name: string;
  share_url: string;
};

export type BinderLinksPanelProps = {
  binderId: string;
  editable?: boolean;
};

export function BinderLinksPanel({ binderId, editable = false }: BinderLinksPanelProps) {
  const [links, setLinks] = useState<LinkRow[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/links`);
    const raw = await res.json().catch(() => ({}));
    const payload = extractApiPayload(raw);
    if (!res.ok) return;
    setLinks((payload as { links?: LinkRow[] }).links ?? []);
  }, [binderId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Panel className="space-y-mca-sm">
      <h3 className="text-sm font-semibold text-mca-ink-body">Linked binders</h3>
      <ul className="space-y-mca-xs">
        {links.map((l) => (
          <li key={l.id}>
            <Link href={l.share_url} className="text-sm text-mca-accent-strong/90 hover:underline">
              {l.label}
            </Link>
            <span className="ml-mca-xs text-xs text-mca-ink-subtle">({l.target_name})</span>
          </li>
        ))}
      </ul>
      {links.length === 0 ? <p className="text-sm text-mca-ink-muted">No links yet.</p> : null}
      {editable ? (
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Refresh links
        </Button>
      ) : null}
    </Panel>
  );
}
