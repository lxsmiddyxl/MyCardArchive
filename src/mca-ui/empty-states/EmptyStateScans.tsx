import { EmptyStateBase } from "@/mca-ui/empty-states/empty-state-base";

export function EmptyStateScans() {
  return (
    <EmptyStateBase
      illustrationSrc="/artwork/empty-states/empty-no-scan-results.svg"
      title="No scans yet"
      description="Point your camera at a Pokémon card to identify it and add it to a binder."
      primaryAction={{ href: "/scan", label: "Scan a card" }}
    />
  );
}
