import { TradesDashboardClient } from "@/components/trading/trades-dashboard-client";
import { AppSegmentLoading } from "@/components/system/app-segment-loading";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function TradesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/trades"));
  }

  return (
    <Suspense fallback={<AppSegmentLoading label="Loading trades" />}>
      <TradesDashboardClient userId={user.id} />
    </Suspense>
  );
}
