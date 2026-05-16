import { EmptyStateBase } from "@/mca-ui/empty-states/empty-state-base";

export function EmptyStateGroups() {
  return (
    <EmptyStateBase
      illustrationSrc="/artwork/empty-states/empty-no-decks.svg"
      title="No binder groups yet"
      description="Bundle themed binders with a title, description, and optional cover for sharing."
      primaryAction={{ href: "/binders/collections", label: "Create a group" }}
    />
  );
}
