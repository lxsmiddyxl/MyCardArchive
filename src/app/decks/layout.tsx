import { OfflineNotice } from "@/components/system/offline-notice";

export default function DecksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
