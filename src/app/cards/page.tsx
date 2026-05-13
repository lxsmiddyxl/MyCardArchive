import { HotPathTracker } from "@/components/perf/hot-path-tracker";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
const CardsInventoryClient = dynamic(
  () =>
    import("@/components/cards/inventory-client").then((m) => ({ default: m.CardsInventoryClient })),
  {
    loading: () => (
      <div className="flex min-h-[12rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 text-sm text-mca-ink-subtle">
        Loading inventory…
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: "Collection inventory",
  description: "Read-only view of all Pokémon cards across your binders.",
};

export default async function CardsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/cards"));
  }

  return (
    <>
      <HotPathTracker pathId="hp:search:cards" />
      <CardsInventoryClient />
    </>
  );
}
