import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { SuspenseFallbackMarker } from "@/lib/telemetry";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import { MCAErrorBoundary } from "@/mca-ui/error-boundary";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const DeckEditorOwnedCardsClient = dynamic(
  () =>
    import("./deck-editor-owned-cards-client").then((m) => ({
      default: m.DeckEditorOwnedCardsClient,
    })),
  {
    loading: () => (
      <div className="flex min-h-[16rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 text-sm text-mca-ink-subtle">
        <SuspenseFallbackMarker name="deck-editor" />
        Loading deck editor…
      </div>
    ),
  }
);

type PageProps = {
  params: { deckId: string };
};

async function loadDeck(
  deckId: string,
  userId: string
): Promise<{ id: string; name: string } | null> {
  const supabase = createClient();

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();

  if (deckError) {
    throw new Error(deckError.message);
  }
  if (!deck) {
    return null;
  }
  return deck;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const deckId = params.deckId?.trim() ?? "";
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { title: "Deck Editor" };
    }

    const payload = await loadDeck(deckId, user.id);
    return {
      title: payload ? `${payload.name}` : "Deck Editor",
    };
  } catch {
    return { title: "Deck Editor" };
  }
}

export default async function DeckEditorPage({ params }: PageProps) {
  let cleanDeckId = "";
  try {
    cleanDeckId = params.deckId?.trim() ?? "";
  } catch {
    return (
      <div className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/60 p-mca-xl text-center dark:border-mca-border-subtle">
        <h1 className="text-lg font-semibold text-mca-ink-strong">Deck editor</h1>
        <p className="mt-mca-sm text-sm text-mca-ink-subtle">
          Something went wrong loading this page. Return to your decks and try again.
        </p>
        <Link
          href="/decks"
          className="mt-mca-lg inline-flex rounded-mca-control border border-mca-field-border px-mca-base py-mca-sm text-sm text-mca-ink-soft hover:bg-mca-chrome/60"
        >
          Back to decks
        </Link>
      </div>
    );
  }

  let user: { id: string } | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch (e) {
    logServerError({
      scope: "ssr",
      route: "/decks/[deckId] getUser",
      err: e,
    });
    redirect(authSignInUrl(`/decks/${encodeURIComponent(cleanDeckId)}`));
  }

  if (!user) {
    redirect(authSignInUrl(`/decks/${encodeURIComponent(cleanDeckId ?? "")}`));
  }

  if (!cleanDeckId) {
    redirect("/decks");
  }

  let deck: { id: string; name: string } | null = null;
  try {
    deck = await loadDeck(cleanDeckId, user.id);
  } catch (e) {
    logServerError({
      scope: "ssr",
      route: "/decks/[deckId] loadDeck",
      userId: user.id,
      err: e,
    });
    return (
      <div className="space-y-mca-xl">
        <header className="border-b border-mca-border/80 pb-mca-lg">
          <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong">Deck editor</h1>
          <p className="mt-mca-sm text-sm text-mca-ink-subtle">
            We could not load this deck from the database. Check your connection or try again later.
          </p>
        </header>
        <div className="rounded-mca-card border border-mca-warning-surface-border/40 bg-mca-warning-surface/20 p-mca-lg text-sm text-mca-nav-accent">
          <p>If the problem persists, open the deck list and re-open the editor from there.</p>
          <Link
            href="/decks"
            className="mt-mca-base inline-flex rounded-mca-control border border-mca-accent-strong/40 px-mca-base py-mca-sm text-mca-warning-tint hover:bg-mca-warning-surface-border/30"
          >
            Back to decks
          </Link>
        </div>
      </div>
    );
  }

  if (!deck) {
    redirect("/decks");
  }

  return (
    <div className="space-y-mca-xl">
      <header className="border-b border-mca-border/80 pb-mca-lg">
        <h1 className="mca-section-reveal text-2xl font-semibold tracking-tight text-mca-ink-strong sm:text-3xl">
          {deck.name}
        </h1>
        <p className="mca-section-reveal mca-section-reveal-delay-1 mt-mca-sm text-sm text-mca-ink-subtle">
          Edit list composition, format, and legality.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="flex min-h-[16rem] items-center justify-center rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 text-sm text-mca-ink-subtle">
            <SuspenseFallbackMarker name="deck-editor" />
            Loading deck editor…
          </div>
        }
      >
        <MCAErrorBoundary
          componentName="DeckEditorOwnedCardsClient"
          surfaceName="deck-editor"
          title="Deck editor unavailable"
        >
          <DeckEditorOwnedCardsClient deckId={cleanDeckId} />
        </MCAErrorBoundary>
      </Suspense>
    </div>
  );
}
