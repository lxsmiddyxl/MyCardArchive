import { OfflineNotice } from "@/components/system/offline-notice";
import { mcaSegmentMetadata } from "@/lib/seo/segment-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = mcaSegmentMetadata({
  title: "Decks",
  description: "Build and manage Pokémon TCG deck lists with legality hints.",
  path: "/decks",
});

export default function DecksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
