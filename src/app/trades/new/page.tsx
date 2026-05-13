import { TradeNewClient } from "@/components/trading/trade-new-client";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "New trade",
};

function firstSearchParam(
  v: string | string[] | undefined
): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) return v[0].trim();
  return null;
}

export default async function NewTradePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/trades/new"));
  }

  const initialCounterpartyId = firstSearchParam(searchParams.counterparty);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[12rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 px-mca-md text-mca-body text-mca-ink-subtle">
          Loading…
        </div>
      }
    >
      <TradeNewClient
        currentUserId={user.id}
        initialCounterpartyId={initialCounterpartyId}
      />
    </Suspense>
  );
}
