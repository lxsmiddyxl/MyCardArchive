import { OfflineNotice } from "@/components/system/offline-notice";

export default function MatchingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
