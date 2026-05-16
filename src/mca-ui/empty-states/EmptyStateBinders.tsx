import { EmptyStateBase } from "@/mca-ui/empty-states/empty-state-base";

export function EmptyStateBinders({ atLimit }: { atLimit?: boolean }) {
  return (
    <EmptyStateBase
      illustrationSrc="/artwork/empty-states/empty-no-binders.svg"
      title="No binders yet"
      description="Create your first binder to start a shelf—add pages, fill slots, and open any card for details."
      primaryAction={
        atLimit ? undefined : { href: "/binders/new", label: "Create binder" }
      }
    />
  );
}
