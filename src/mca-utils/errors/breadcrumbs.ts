import { mcaLog } from "@/lib/logging/mca-log-client";

const CTX = { componentName: "mca.breadcrumbs", surfaceName: "binder" } as const;

export type BinderBreadcrumbAction =
  | "open"
  | "page_change"
  | "slot_view"
  | "move"
  | "copy"
  | "remove";

/** Client-side breadcrumb for binder interactions (no card IDs or PII). */
export function addBinderBreadcrumb(
  action: BinderBreadcrumbAction,
  data: Readonly<Record<string, unknown>> = {}
): void {
  mcaLog.event(
    "breadcrumb.binder",
    { action, ...data },
    CTX
  );
}
