import { AdminErrorsClient } from "@/mca-ui/admin/AdminErrorsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Errors · Admin",
  robots: { index: false, follow: false },
};

export default function AdminErrorsPage() {
  return (
    <div className="space-y-mca-lg">
      <h2 className="text-xl font-semibold text-mca-ink-strong">Error monitoring</h2>
      <AdminErrorsClient />
    </div>
  );
}
