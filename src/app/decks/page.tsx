import { DeckListView } from "@/components/decks/deck-list-view";
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
    redirect("/login?next=/decks");
  }

  if (!user) {
    redirect("/login?next=/decks");
  }

  return (
    <DeckListView />
  );
}
