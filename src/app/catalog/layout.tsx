import { OfflineNotice } from "@/components/system/offline-notice";
import { mcaSegmentMetadata } from "@/lib/seo/segment-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = mcaSegmentMetadata({
  title: "Catalog",
  description: "Browse Pokémon TCG sets and cards synced to MyCardArchive.",
  path: "/catalog",
});

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
