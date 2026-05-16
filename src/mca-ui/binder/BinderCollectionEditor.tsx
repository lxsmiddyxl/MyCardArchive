"use client";

import { extractApiPayload } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { useState } from "react";

type Collection = {
  id: string;
  name: string;
  items: Array<{ binder_id: string; binder_name: string }>;
};

export type BinderCollectionEditorProps = {
  onChanged?: (collections: Collection[]) => void;
};

export function BinderCollectionEditor({ onChanged }: BinderCollectionEditorProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await fetch("/api/binder-collections/list");
    const raw = await res.json().catch(() => ({}));
    const payload = extractApiPayload(raw);
    if (res.ok) {
      onChanged?.((payload as { collections?: Collection[] }).collections ?? []);
    }
  };

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Collections</h2>
      <Field id="collection-name" label="New collection">
        <input
          id="collection-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm"
          placeholder="My Favorites"
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={busy || !name.trim()}
        onClick={() => {
          setBusy(true);
          void (async () => {
            try {
              await fetch("/api/binder-collections/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
              });
              setName("");
              await refresh();
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Create collection
      </Button>
    </Panel>
  );
}
