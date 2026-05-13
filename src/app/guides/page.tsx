import { DeckGuidesClient } from "@/app/guides/deck-guides-client";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Deck guides",
};

export default async function GuidesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/guides"));
  }

  return (
    <div className="space-y-mca-xl">
      <SurfaceMountTelemetry name="deck-guides" surfaceName="creator" />
      <header className="border-b border-mca-border pb-mca-lg">
        <p className="mca-typo-label">Creator</p>
        <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink sm:text-4xl">
          Deck guides
        </h1>
        <p className="mt-mca-md text-mca-body text-mca-ink-muted">
          Write strategy notes and card highlights for your decks. Guides for public decks can be read by other
          signed-in trainers.
        </p>
      </header>
      <DeckGuidesClient />
    </div>
  );
}
