import { OfflineNotice } from "@/components/system/offline-notice";

export default function BindersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
