"use client";

import { Panel } from "@/mca-ui/panel";
import { useEffect, useState } from "react";

export function ShowcaseLongFormPage({ showcaseId }: { showcaseId: string }) {
  const [body, setBody] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/showcases/${showcaseId}/long-form`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json() as Promise<{ showcase: { title: string; longFormBody: string | null } }>;
      })
      .then((j) => {
        if (!cancelled) {
          setTitle(j.showcase.title);
          setBody(j.showcase.longFormBody ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setBody("");
      });
    return () => {
      cancelled = true;
    };
  }, [showcaseId]);

  if (body === null) {
    return <p className="text-mca-body text-mca-ink-muted">Loading showcase…</p>;
  }

  return (
    <Panel className="border-mca-border bg-mca-surface/40 p-mca-lg">
      <h1 className="text-mca-title font-semibold text-mca-ink">{title}</h1>
      <p className="mt-mca-xs text-mca-caption text-mca-hint">Long-form showcase · qualitative only</p>
      <article className="prose-mca mt-mca-lg whitespace-pre-wrap text-mca-body text-mca-ink-body">
        {body || "No long-form narrative yet."}
      </article>
    </Panel>
  );
}
