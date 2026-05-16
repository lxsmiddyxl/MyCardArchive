"use client";

import { Field } from "@/mca-ui/field";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useState } from "react";

export type ProfileBannerEditorProps = {
  initialUrl: string | null;
};

export function ProfileBannerEditor({ initialUrl }: ProfileBannerEditorProps) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <Panel className="space-y-mca-md">
      <h2 className="text-sm font-semibold text-mca-ink-body">Profile banner</h2>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-28 w-full rounded-mca-card object-cover" />
      ) : null}
      <Field id="banner-url" label="Banner image URL">
        <input
          id="banner-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-mca-control border border-mca-field-border px-mca-sm py-mca-tight text-sm"
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void fetch("/api/users/profile/banner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ banner_url: url.trim() || null }),
          }).finally(() => setBusy(false));
        }}
      >
        Save banner
      </Button>
    </Panel>
  );
}
