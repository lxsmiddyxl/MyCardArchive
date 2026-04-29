import { TradesDashboardClient } from "@/components/trading/trades-dashboard-client";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Trades",
  description: "Peer-to-peer Pokémon card trades with your collection.",
};

export default async function TradesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trades");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[12rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 px-mca-md text-mca-body text-mca-ink-subtle">
          Loading trades…
        </div>
      }
    >
      <TradesDashboardClient userId={user.id} />
    </Suspense>
  );
}
