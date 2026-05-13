import { OfflineNotice } from "@/components/system/offline-notice";
import { mcaSegmentMetadata } from "@/lib/seo/segment-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = mcaSegmentMetadata({
  title: "Profile",
  description: "Your collector profile, presence, and social activity on MyCardArchive.",
  path: "/profile",
});

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
