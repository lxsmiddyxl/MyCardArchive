"use client";

import { extractApiPayload } from "@/lib/client";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { useState } from "react";

export function ShowcaseEditor() {
  const [binderId, setBinderId] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Edit showcase</h2>
      <Field id="showcase-binder" label="Pin binder by ID">
        <input
          id="showcase-binder"
          value={binderId}
          onChange={(e) => setBinderId(e.target.value)}
          className="w-full rounded-mca-control border border-mca-field-border px-mca-sm py-mca-tight text-sm"
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={busy || !binderId.trim()}
        onClick={() => {
          setBusy(true);
          void (async () => {
            try {
              const res = await fetch("/api/profile/showcase/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ binder_id: binderId.trim() }),
              });
              extractApiPayload(await res.json().catch(() => ({})));
              setBinderId("");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Add to showcase
      </Button>
    </Panel>
  );
}
