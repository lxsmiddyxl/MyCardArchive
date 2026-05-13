import { OfflineNotice } from "@/components/system/offline-notice";
import { mcaSegmentMetadata } from "@/lib/seo/segment-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = mcaSegmentMetadata({
  title: "Trades",
  description: "Propose and manage Pokémon card trades with other collectors.",
  path: "/trades",
});

export default function TradesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
