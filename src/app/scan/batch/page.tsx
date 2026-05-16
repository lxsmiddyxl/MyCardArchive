import { BatchScanClient } from "@/components/scan/batch-scan-client";

export const metadata = {
  title: "Batch scan",
  description: "Scan multiple Pokémon cards in one session.",
};

export default function BatchScanPage() {
  return <BatchScanClient />;
}
