"use client";

import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const TEL = { componentName: "ReportIssuePanel", surfaceName: "support" } as const;

export function ReportIssuePanel() {
  const pathname = usePathname() ?? "/";
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return JSON.stringify(
      {
        app: "MyCardArchive",
        path: pathname,
        href: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language,
        online: navigator.onLine,
        ts: new Date().toISOString(),
      },
      null,
      2
    );
  }, [pathname]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      mcaLog.event("support.report_payload.copy", { path: pathname }, TEL);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [payload, pathname]);

  return (
    <Panel className="border border-mca-border bg-mca-surface-elevated/50 p-mca-lg">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Structured report
      </p>
      <p className="mt-mca-sm text-sm text-mca-ink-muted">
        Copy this block into email or chat so we can triage faster. It includes your current route and
        browser info—no secrets are included.
      </p>
      <Field id="report-json" label="Diagnostics" className="mt-mca-md">
        <pre
          id="report-json"
          className="max-h-48 overflow-auto rounded-mca-block border border-mca-border-subtle bg-mca-surface p-mca-sm text-mca-caption text-mca-ink-body"
        >
          {payload}
        </pre>
      </Field>
      <Button type="button" variant="secondary" className="mt-mca-md" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy diagnostics"}
      </Button>
    </Panel>
  );
}
