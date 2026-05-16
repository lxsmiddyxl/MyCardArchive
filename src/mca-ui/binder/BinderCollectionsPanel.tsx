"use client";

import { extractApiPayload } from "@/lib/client";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BinderCollectionEditor } from "@/mca-ui/binder/BinderCollectionEditor";

type Collection = {
  id: string;
  name: string;
  items: Array<{ binder_id: string; binder_name: string }>;
};

export function BinderCollectionsPanel() {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/binder-collections/list");
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (!res.ok) return;
      setCollections((payload as { collections?: Collection[] }).collections ?? []);
    })();
  }, []);

  return (
    <div className="space-y-mca-lg">
      <BinderCollectionEditor onChanged={setCollections} />
      {collections.map((c) => (
        <Panel key={c.id} className="space-y-mca-sm">
          <h3 className="font-semibold text-mca-ink-body">{c.name}</h3>
          <ul className="space-y-mca-xs">
            {c.items.map((item) => (
              <li key={item.binder_id}>
                <Link href={`/binders/${item.binder_id}`} className="text-sm hover:underline">
                  {item.binder_name}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
