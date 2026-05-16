"use client";

import { Button } from "@/mca-ui/button";
import { useState } from "react";

export type BinderExportButtonProps = {
  binderId: string;
};

export function BinderExportButton({ binderId }: BinderExportButtonProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void (async () => {
          try {
            const res = await fetch(`/api/binders/${encodeURIComponent(binderId)}/export`, {
              method: "POST",
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "binder-export.html";
            a.click();
            URL.revokeObjectURL(url);
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {busy ? "Exporting…" : "Export HTML"}
    </Button>
  );
}
