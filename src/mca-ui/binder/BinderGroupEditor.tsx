"use client";

import { extractApiPayload } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { useState } from "react";

export function BinderGroupEditor() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Binder groups</h2>
      <Field id="group-title" label="Title">
        <input
          id="group-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-mca-control border border-mca-field-border px-mca-sm py-mca-tight text-sm"
        />
      </Field>
      <Field id="group-desc" label="Description">
        <textarea
          id="group-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-mca-control border border-mca-field-border px-mca-sm py-mca-tight text-sm"
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={busy || !title.trim()}
        onClick={() => {
          setBusy(true);
          void (async () => {
            try {
              const res = await fetch("/api/binder-groups/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: title.trim(), description }),
              });
              const raw = await res.json().catch(() => ({}));
              extractApiPayload(raw);
              setTitle("");
              setDescription("");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Create group
      </Button>
    </Panel>
  );
}
