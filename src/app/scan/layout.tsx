import { OfflineNotice } from "@/components/system/offline-notice";

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
