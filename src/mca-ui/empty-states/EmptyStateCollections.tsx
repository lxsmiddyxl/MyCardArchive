import { EmptyStateBase } from "@/mca-ui/empty-states/empty-state-base";

export function EmptyStateCollections() {
  return (
    <EmptyStateBase
      illustrationSrc="/artwork/empty-states/empty-no-binders.svg"
      title="No collections yet"
      description="Group binders into sets like favorites, trade binders, or showcases."
      primaryAction={{ href: "/binders/collections", label: "Create a collection" }}
    />
  );
}
