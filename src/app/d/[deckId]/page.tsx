import { PublicDeckToolbar } from "./public-deck-toolbar";
import { PublicDeckViewerClient } from "./public-deck-viewer-client";
import type { PublicDeckCard } from "@/lib/public-deck/load-public-deck";
import { loadPublicDeck } from "@/lib/public-deck/load-public-deck";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/** ISR: public deck HTML can be cached; client modals still work on hydrated page. */
export const revalidate = 120;

type PageProps = {
  params: { deckId: string };
};

function siteBase(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return u && u.length > 0 ? u : "http://localhost:3000";
}

function colorChipClass(token: string): string {
  const t = token.toLowerCase();
  const map: Record<string, string> = {
    w: "bg-mca-warning-tint text-mca-warning-text dark:bg-mca-accent-strong/20 dark:text-mca-nav-accent",
    u: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
    b: "bg-mca-type-psychic-tint text-mca-type-psychic-ink dark:bg-mca-type-psychic/20 dark:text-mca-type-psychic-soft",
    r: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
    g: "bg-mca-success-tint text-mca-success-text dark:bg-mca-success-bold/20 dark:text-mca-success-ink",
    grass: "bg-mca-success-tint text-mca-success-text dark:bg-mca-success-bold/20 dark:text-mca-success-ink",
    fire: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
    water: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
    lightning: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-200",
    psychic: "bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-200",
    fighting: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200",
    darkness: "bg-mca-border-subtle text-mca-ink-strong dark:bg-mca-neutral-dot dark:text-mca-ink",
    metal: "bg-slate-200 text-slate-900 dark:bg-slate-500/30 dark:text-slate-100",
    fairy: "bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-200",
    dragon: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200",
  };
  return map[t] ?? "bg-mca-border-light text-mca-chrome dark:bg-mca-border-subtle dark:text-mca-ink-soft";
}

function ColorIdentityBadges({ colors }: { colors: string[] }) {
  if (!colors.length) {
    return <span className="text-sm text-mca-ink-subtle dark:text-mca-ink-muted">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-mca-micro">
      {colors.map((c) => (
        <span
          key={c}
          className={`inline-flex rounded-mca-control px-mca-sm py-mca-trace text-[11px] font-semibold uppercase tracking-wide ${colorChipClass(c)}`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function ReadOnlyCardRow({ card }: { card: PublicDeckCard }) {
  return (
    <div className="group relative flex items-center justify-between gap-mca-compact overflow-visible rounded-mca-block border border-mca-border-light bg-mca-surface-light px-mca-compact py-mca-tight shadow-mca-panel transition-all duration-200 ease-mca-standard hover:-translate-y-px hover:shadow-mca-panel dark:border-mca-border-subtle dark:bg-mca-surface-elevated/80">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-mca-surface-elevated dark:text-mca-ink-strong">
          {card.name}
        </p>
        {card.number || card.rarity ? (
          <p className="truncate text-xs text-mca-ink-subtle dark:text-mca-ink-muted">
            {[card.number, card.rarity].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 tabular-nums text-sm text-mca-hint dark:text-mca-ink-body">
        ×{card.quantity}
      </span>
      {card.image_url ? (
        <div
          className="pointer-events-none absolute left-full top-1/2 z-30 ml-mca-compact hidden w-36 -translate-y-1/2 opacity-0 shadow-mca-card transition-all duration-200 ease-mca-standard group-hover:block group-hover:opacity-100 sm:w-44"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image_url}
            alt=""
            className="mca-tile-mount rounded-mca-block border border-mca-border-light bg-white dark:border-mca-field-border dark:bg-mca-surface-elevated"
          />
        </div>
      ) : null}
    </div>
  );
}

function CardZone({
  title,
  cards,
}: {
  title: string;
  cards: PublicDeckCard[];
}) {
  return (
    <section className="mca-section-reveal rounded-mca-block border border-mca-border-light bg-mca-surface-paper p-mca-base shadow-mca-panel transition-all duration-200 dark:border-mca-border dark:bg-mca-surface/80">
      <h2 className="mca-section-reveal text-sm font-semibold uppercase tracking-wide text-mca-hint dark:text-mca-ink-body">
        {title}{" "}
        <span className="font-normal text-mca-ink-subtle">({cards.length})</span>
      </h2>
      <div className="mt-mca-compact space-y-mca-sm">
        {cards.length === 0 ? (
          <p className="text-xs text-mca-ink-subtle dark:text-mca-ink-subtle">Empty</p>
        ) : (
          cards.map((c) => <ReadOnlyCardRow key={`${c.card_id}-${c.section}`} card={c} />)
        )}
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  let deckId = "";
  try {
    deckId = params.deckId ?? "";
  } catch {
    return {
      title: { absolute: "Deck — MyCardArchive" },
      description: "Unable to load deck.",
      robots: { index: false, follow: false },
    };
  }

  let result: Awaited<ReturnType<typeof loadPublicDeck>>;
  try {
    result = await loadPublicDeck(deckId);
  } catch {
    return {
      title: { absolute: "Deck — MyCardArchive" },
      description: "Unable to load deck.",
      robots: { index: false, follow: false },
    };
  }

  const base = siteBase();

  if (!result.ok) {
    const isForbidden = result.status === 403;
    const titleAbsolute = isForbidden
      ? "Private deck — MyCardArchive"
      : "Deck not found — MyCardArchive";
    return {
      title: { absolute: titleAbsolute },
      description: isForbidden
        ? "This deck is not shared publicly."
        : "This deck link is invalid or expired.",
      robots: { index: false, follow: false },
    };
  }

  const { deck } = result.data;
  const deckTitle = deck.name?.trim() || "Deck";
  const deckFormat = deck.format?.trim() || "standard";
  const titleAbsolute = `${deckTitle} — MyCardArchive`;
  const description = `View this ${deckFormat} deck on MyCardArchive.`;
  const ogPath = `/d/${deckId}/opengraph-image`;

  return {
    title: { absolute: titleAbsolute },
    description,
    openGraph: {
      title: titleAbsolute,
      description,
      type: "website",
      url: `${base}/d/${deckId}`,
      images: [{ url: ogPath, width: 1200, height: 630, alt: deckTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: titleAbsolute,
      description,
      images: [`${base}${ogPath}`],
    },
  };
}

export default async function PublicDeckPage({ params }: PageProps) {
  let deckId = "";
  try {
    deckId = params.deckId ?? "";
  } catch {
    notFound();
  }

  let result: Awaited<ReturnType<typeof loadPublicDeck>>;
  try {
    result = await loadPublicDeck(deckId);
  } catch {
    notFound();
  }

  if (!result.ok) {
    if (result.status === 404 || result.status === 500) notFound();
    return (
      <div className="mca-section-reveal space-y-mca-base py-mca-stage text-center">
        <h1 className="text-2xl font-semibold text-mca-surface-elevated dark:text-mca-ink-strong">
          Private deck
        </h1>
        <p className="text-sm text-mca-hint dark:text-mca-ink-muted">
          The owner has not made this deck public.
        </p>
        <Link
          href="/"
          className="inline-block text-sm font-medium text-mca-accent-deep underline-offset-2 hover:underline dark:text-mca-accent"
        >
          Back to MyCardArchive
        </Link>
      </div>
    );
  }

  const { data } = result;
  const est =
    typeof data.deck.estimated_value === "number"
      ? data.deck.estimated_value
      : typeof data.deck.estimated_value === "string"
        ? Number(data.deck.estimated_value)
        : 0;

  let viewerId: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
  } catch {
    viewerId = null;
  }

  const viewerIsOwner = Boolean(
    viewerId && data.owner_user_id && viewerId === data.owner_user_id
  );
  const shareUrl = `${siteBase()}/d/${encodeURIComponent(deckId)}`;

  return (
    <div className="space-y-mca-xl">
      <header className="mca-section-reveal flex flex-col gap-mca-lg border-b border-mca-border-light pb-mca-xl dark:border-mca-border sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-mca-compact">
          <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle dark:text-mca-ink-muted">
            Shared deck
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-mca-surface-elevated dark:text-mca-ink">
            {data.deck.name}
          </h1>
          <p className="text-sm text-mca-hint dark:text-mca-ink-muted">
            by{" "}
            <span className="font-medium text-mca-chrome dark:text-mca-ink-soft">
              {data.owner_display_name}
            </span>
            <span className="mx-mca-sm text-mca-ink-muted">·</span>
            <span className="capitalize">{data.deck.format}</span>
          </p>
          <PublicDeckToolbar
            deckId={deckId}
            deckName={data.deck.name}
            shareUrl={shareUrl}
            viewerIsOwner={viewerIsOwner}
          />
          <div>
            <p className="mb-mca-xs text-xs font-medium uppercase tracking-wide text-mca-ink-subtle dark:text-mca-ink-subtle">
              Type tags
            </p>
            <ColorIdentityBadges colors={data.deck_stats?.color_identity ?? []} />
          </div>
        </div>
        {data.hero?.image_url ? (
          <div className="shrink-0 sm:ml-mca-base">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.hero.image_url}
              alt={data.hero?.name ?? ""}
              className="mca-row-reveal h-44 w-auto max-w-[11rem] rounded-mca-block border border-mca-border-light object-cover shadow-mca-panel dark:border-mca-border-subtle sm:h-52"
            />
          </div>
        ) : null}
      </header>

      <section className="mca-section-reveal mca-section-reveal-delay-1 rounded-mca-block border border-mca-border-light bg-mca-surface-paper p-mca-base shadow-mca-panel dark:border-mca-border dark:bg-mca-surface/80">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mca-hint dark:text-mca-ink-body">
          Stats
        </h2>
        <dl className="mt-mca-compact grid gap-mca-compact sm:grid-cols-3">
          <div>
            <dt className="text-xs text-mca-ink-subtle dark:text-mca-ink-subtle">Cards</dt>
            <dd className="text-lg font-semibold tabular-nums text-mca-surface-elevated dark:text-mca-ink-strong">
              {data.deck_stats?.total_cards ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-mca-ink-subtle dark:text-mca-ink-subtle">Unique</dt>
            <dd className="text-lg font-semibold tabular-nums text-mca-surface-elevated dark:text-mca-ink-strong">
              {data.deck_stats?.unique_cards ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-mca-ink-subtle dark:text-mca-ink-subtle">Est. value</dt>
            <dd className="text-lg font-semibold tabular-nums text-mca-surface-elevated dark:text-mca-ink-strong">
              {Number.isFinite(est) ? `$${est.toFixed(2)}` : "—"}
            </dd>
          </div>
        </dl>
        {data.deck?.type_distribution &&
        Object.keys(data.deck.type_distribution).length > 0 ? (
          <div className="mt-mca-base border-t border-mca-border-light pt-mca-base dark:border-mca-border">
            <p className="text-xs font-medium uppercase tracking-wide text-mca-ink-subtle dark:text-mca-ink-subtle">
              Types
            </p>
            <ul className="mt-mca-sm space-y-mca-xs text-xs text-mca-border-subtle dark:text-mca-ink-body">
              {Object.entries(data.deck.type_distribution).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-mca-sm">
                  <span className="truncate">{k}</span>
                  <span className="tabular-nums text-mca-ink-subtle">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mca-section-reveal mca-section-reveal-delay-1 rounded-mca-block border border-mca-border-light bg-mca-surface-paper p-mca-base shadow-mca-panel dark:border-mca-border dark:bg-mca-surface/80">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mca-hint dark:text-mca-ink-body">
          Legality
        </h2>
        {data.legality?.legal ? (
          <p className="mt-mca-sm text-sm font-medium text-mca-success-bold dark:text-mca-success">
            Legal · <span className="capitalize">{data.legality?.format ?? "standard"}</span>
          </p>
        ) : (
          <p className="mt-mca-sm text-sm font-medium text-mca-accent-border dark:text-mca-accent-highlight">
            Issues · <span className="capitalize">{data.legality?.format ?? "standard"}</span>
          </p>
        )}
        {(data.legality.issues?.length ?? 0) > 0 ? (
          <ul className="mt-mca-compact list-inside list-disc space-y-mca-xs text-xs text-mca-border-subtle dark:text-mca-ink-body">
            {(data.legality.issues ?? []).map((issue, idx) => (
              <li key={`${issue.card_id}-${idx}`}>
                <span className="font-medium text-mca-surface-elevated dark:text-mca-ink-strong">
                  {issue.name}
                </span>
                {": "}
                {issue.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="grid gap-mca-base lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-mca-base">
          <CardZone title="Main deck" cards={data.cards?.main ?? []} />
          <CardZone title="Side deck" cards={data.cards?.sideboard ?? []} />
          <CardZone title="Brawl" cards={data.cards?.commander ?? []} />
        </div>
        <div className="space-y-mca-base">
          <div className="mca-section-reveal rounded-mca-block border border-mca-border-light bg-mca-surface-paper p-mca-base shadow-mca-panel dark:border-mca-border dark:bg-mca-surface/80">
            <PublicDeckViewerClient payload={data} />
          </div>
          <p className="text-center text-xs text-mca-ink-subtle dark:text-mca-ink-subtle">
            <Link href="/" className="font-medium text-mca-accent-deep hover:underline dark:text-mca-accent">
              MyCardArchive
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
