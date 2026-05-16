import { AdminAnalyticsClient } from "@/mca-ui/admin/AdminAnalyticsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics · Admin",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-mca-lg">
      <h2 className="text-xl font-semibold text-mca-ink-strong">Analytics dashboards</h2>
      <AdminAnalyticsClient />
    </div>
  );
}
