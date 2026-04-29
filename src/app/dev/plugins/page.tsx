import { PluginsInspectorClient } from "@/app/dev/plugins/plugins-inspector-client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Plugins (dev)",
};

export default function DevPluginsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-mca-lg p-mca-md">
      <header>
        <h1 className="text-mca-h2 text-mca-ink-strong">Plugin registry (dev)</h1>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          Static example plugins for metadata, scoring, and grading overlays. Loads are logged server-side (
          <code className="text-mca-caption">plugin.load</code>, <code className="text-mca-caption">plugin.error</code>
          ).
        </p>
      </header>
      <PluginsInspectorClient />
    </div>
  );
}
