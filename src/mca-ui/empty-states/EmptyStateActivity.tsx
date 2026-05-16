import { EmptyStateBase } from "@/mca-ui/empty-states/empty-state-base";

export function EmptyStateActivity() {
  return (
    <EmptyStateBase
      illustrationSrc="/artwork/empty-states/empty-no-activity.svg"
      title="No activity yet"
      description="Trades, scans, and binder updates will show up here as you collect."
      primaryAction={{ href: "/scan", label: "Scan your first card" }}
    />
  );
}
