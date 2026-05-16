"use client";

import { mcaAbsoluteUrl } from "@/lib/seo/site-url";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useMemo, useState } from "react";

export type BinderEmbedCodeProps = {
  binderId: string;
};

export function BinderEmbedCode({ binderId }: BinderEmbedCodeProps) {
  const [copied, setCopied] = useState(false);
  const embedSrc = useMemo(() => mcaAbsoluteUrl(`/embed/b/${binderId}`), [binderId]);
  const snippet = `<iframe src="${embedSrc}" width="400" height="520" style="border:0;border-radius:12px" title="MyCardArchive binder" loading="lazy"></iframe>`;

  return (
    <Panel className="space-y-mca-sm">
      <h2 className="text-sm font-semibold text-mca-ink-body">Embed this binder</h2>
      <p className="text-xs text-mca-ink-muted">Paste on your site or blog (public binders only).</p>
      <pre className="overflow-x-auto rounded-mca-control border border-mca-border-subtle bg-mca-chrome/30 p-mca-sm text-[11px] text-mca-ink-muted">
        {snippet}
      </pre>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(snippet).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "Copied" : "Copy embed code"}
      </Button>
    </Panel>
  );
}
