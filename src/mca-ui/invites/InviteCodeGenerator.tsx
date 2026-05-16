"use client";

import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { useCallback, useState } from "react";

type CreateResult = { code: string; id?: string };

export function InviteCodeGenerator() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const create = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await fetchJson<CreateResult>("/api/invites/create", { method: "POST" });
    setLoading(false);
    if (r.kind !== "ok" || !r.data.code) {
      setError(r.kind !== "ok" ? fetchJsonErrorMessage(r) : "Could not create invite code.");
      return;
    }
    setCode(r.data.code);
  }, []);

  return (
    <div className="space-y-mca-md rounded-mca-lg border border-mca-border bg-mca-surface-raised p-mca-lg">
      <h2 className="text-mca-lg font-semibold text-mca-ink-strong">Generate invite code</h2>
      <p className="text-mca-sm text-mca-ink-muted">
        For internal admins and unlimited accounts — share a single-use code with new collectors.
      </p>
      {code ? (
        <Field id="invite-code-out" label="Code">
          <input
            id="invite-code-out"
            readOnly
            value={code}
            className="mca-input w-full font-mono"
          />
        </Field>
      ) : null}
      {error ? <p className="text-mca-sm text-mca-error-accent">{error}</p> : null}
      <Button type="button" onClick={create} disabled={loading}>
        {loading ? "Creating…" : code ? "Create another" : "Create invite code"}
      </Button>
    </div>
  );
}
