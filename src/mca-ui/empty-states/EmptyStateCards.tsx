import { EmptyStateBase } from "@/mca-ui/empty-states/empty-state-base";

export type EmptyStateCardsProps = {
  binderId: string;
};

export function EmptyStateCards({ binderId }: EmptyStateCardsProps) {
  return (
    <EmptyStateBase
      illustrationSrc="/artwork/empty-states/empty-no-cards.svg"
      title="No cards in this binder yet"
      description="Add cards manually from the catalog or scan them in with your camera."
      primaryAction={{ href: `/binders/${binderId}/add-card`, label: "Add a card" }}
    />
  );
}
