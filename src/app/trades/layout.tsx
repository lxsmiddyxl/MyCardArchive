import { OfflineNotice } from "@/components/system/offline-notice";

export default function TradesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
