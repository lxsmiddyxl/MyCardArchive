import { DeckListView } from "@/components/decks/deck-list-view";
import { RetentionHintsStrip } from "@/components/retention/retention-hints-strip";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Your Decks",
};

export default async function DecksPage() {
  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    redirect(authSignInUrl("/decks"));
  }

  if (!user) {
    redirect(authSignInUrl("/decks"));
  }

  return (
    <>
      <RetentionHintsStrip />
      <DeckListView />
    </>
  );
}
