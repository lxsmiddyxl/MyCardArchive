import { EmptyStateBase } from "@/mca-ui/empty-states/empty-state-base";

export function EmptyStateShowcase() {
  return (
    <EmptyStateBase
      illustrationSrc="/artwork/empty-states/empty-no-binders.svg"
      title="Nothing in your showcase"
      description="Pin favorite binders or groups to feature them on your collector profile."
      primaryAction={{ href: "/profile/edit", label: "Edit showcase" }}
    />
  );
}
