import {
  CardForm,
  type CardFormInitialValues,
} from "@/components/cards/card-form";
import type { NormalizedCard } from "@/lib/ai/normalize-card";
import { createClient } from "@/lib/supabase/server";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import type { AutoMatchResult } from "@/lib/types/auto-match";
import type { BinderRow } from "@/lib/types/database";
import { getCardCount, getUserTier } from "@/lib/tier/check-limits";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: { binderId: string };
  searchParams: Record<string, string | string[] | undefined>;
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function parseScanPayload(raw: string): {
  auto_match: AutoMatchResult | null;
  normalized: NormalizedCard | null;
} {
  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      auto_match?: AutoMatchResult;
      fused_auto_match?: AutoMatchResult;
      normalized?: NormalizedCard;
      card?: NormalizedCard;
    };
    if (!parsed || typeof parsed !== "object") {
      return { auto_match: null, normalized: null };
    }
    const auto =
      parsed.auto_match && typeof parsed.auto_match === "object"
        ? parsed.auto_match
        : parsed.fused_auto_match && typeof parsed.fused_auto_match === "object"
          ? parsed.fused_auto_match
          : null;
    const normalizedCandidate =
      parsed.normalized && typeof parsed.normalized === "object"
        ? parsed.normalized
        : parsed.card && typeof parsed.card === "object"
          ? parsed.card
        : null;
    const norm =
      normalizedCandidate &&
      (typeof normalizedCandidate.name === "string" ||
        typeof normalizedCandidate.number === "string")
        ? normalizedCandidate
        : null;
    return { auto_match: auto, normalized: norm };
  } catch {
    return { auto_match: null, normalized: null };
  }
}

function bestMatchToInitial(
  bm: NonNullable<AutoMatchResult["best_match"]>
): CardFormInitialValues {
  return {
    name: bm.card_name,
    number: bm.number === "—" ? "" : bm.number,
    rarity: bm.rarity ?? "",
    image_url: bm.image_url,
    catalog_card_id: bm.catalog_card_id?.trim() || undefined,
    set_name: bm.set_name?.trim() || undefined,
  };
}

function firstCatSetName(
  row: {
    catalog_sets?: { name: string } | { name: string }[] | null;
  }
): string | null {
  const cs = row.catalog_sets;
  if (!cs) return null;
  const o = Array.isArray(cs) ? cs[0] : cs;
  return o?.name?.trim() || null;
}

function catalogRowToInitial(row: {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  image_small: string | null;
  image_large: string | null;
  catalog_sets?: { name: string } | { name: string }[] | null;
}): CardFormInitialValues {
  return {
    name: row.name,
    number: row.number,
    rarity: row.rarity ?? "",
    image_url: row.image_large ?? row.image_small ?? null,
    catalog_card_id: row.id,
    set_name: firstCatSetName(row),
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: binder } = await supabase
      .from("binders")
      .select("name")
      .eq("id", params.binderId)
      .eq("user_id", user?.id ?? "")
      .maybeSingle();

    const name = binder?.name;
    return {
      title: name ? `Add card · ${name}` : "Add card",
    };
  } catch {
    return { title: "Add card" };
  }
}

export default async function AddCardPage(props: PageProps) {
  return AddCardPageInner(props);
}

async function AddCardPageInner({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl(`/binders/${params.binderId}/add-card`));
  }

  const { data: binder, error: binderError } = await supabase
    .from("binders")
    .select("id, user_id, name, created_at, description")
    .eq("id", params.binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (binderError || !binder) {
    notFound();
  }

  const b: Pick<BinderRow, "id" | "user_id" | "name"> = {
    id: binder.id,
    user_id: binder.user_id,
    name: binder.name,
  };

  const nameQ = firstParam(searchParams.name);
  const numberQ = firstParam(searchParams.number);
  const rarityQ = firstParam(searchParams.rarity);
  const imageUrlQ = firstParam(searchParams.image_url);
  const scanEventIdQ = firstParam(searchParams.scan_event_id);
  const catalogIdQ = firstParam(searchParams.catalog_card_id);
  const setNameQ = firstParam(searchParams.set_name);

  const scanEventId =
    scanEventIdQ && scanEventIdQ.trim().length > 0
      ? scanEventIdQ.trim()
      : null;

  let initialValues: CardFormInitialValues | null = null;

  if (scanEventId) {
    const { data: ev } = await supabase
      .from("scan_events")
      .select("raw_text")
      .eq("id", scanEventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ev?.raw_text) {
      const { auto_match: auto, normalized: normFromPayload } = parseScanPayload(
        ev.raw_text
      );
      const bm = auto?.best_match;

      if (bm?.catalog_card_id && bm.catalog_card_id.trim().length > 0) {
        const { data: cat } = await supabase
          .from("catalog_cards")
          .select(
            "id, name, number, rarity, image_small, image_large, catalog_sets(name)"
          )
          .eq("id", bm.catalog_card_id.trim())
          .maybeSingle();

        if (cat) {
          initialValues = catalogRowToInitial(cat);
        }
      }

      if (!initialValues && bm && bm.card_name.trim().length > 0) {
        initialValues = bestMatchToInitial(bm);
      }

      if (!initialValues && normFromPayload) {
        const n = normFromPayload;
        const hasName = Boolean(n.name?.trim());
        const hasNum = Boolean(String(n.number ?? "").trim());
        if (hasName || hasNum) {
          initialValues = {
            name: n.name?.trim() ?? "",
            number: typeof n.number === "string" ? n.number : "",
            rarity: typeof n.rarity === "string" ? n.rarity : "",
            image_url: n.image_url ?? null,
          };
        }
      }
    }
  }

  if (!initialValues && catalogIdQ && catalogIdQ.trim().length > 0) {
    const { data: cat } = await supabase
      .from("catalog_cards")
      .select(
        "id, name, number, rarity, image_small, image_large, catalog_sets(name)"
      )
      .eq("id", catalogIdQ.trim())
      .maybeSingle();
    if (cat) {
      initialValues = catalogRowToInitial(cat);
    }
  }

  if (
    !initialValues &&
    (nameQ !== undefined ||
      numberQ !== undefined ||
      rarityQ !== undefined ||
      imageUrlQ !== undefined ||
      setNameQ !== undefined)
  ) {
    initialValues = {
      ...(nameQ !== undefined ? { name: nameQ } : {}),
      ...(numberQ !== undefined ? { number: numberQ } : {}),
      ...(rarityQ !== undefined ? { rarity: rarityQ } : {}),
      ...(imageUrlQ !== undefined ? { image_url: imageUrlQ } : {}),
      ...(setNameQ !== undefined ? { set_name: setNameQ } : {}),
    };
  }

  const [tier, cardCount] = await Promise.all([
    getUserTier(supabase),
    getCardCount(supabase),
  ]);
  const cardLimitReached =
    tier != null && cardCount >= tier.card_limit;

  return (
    <div className="space-y-mca-2xl">
      <div className="space-y-mca-base">
        <Link
          href={`/binders/${b.id}`}
          className="inline-flex text-sm font-medium text-mca-ink-muted transition hover:text-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent"
        >
          ← {b.name}
        </Link>

        <header className="space-y-mca-compact">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-mca-accent-strong/90">
            Binder
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
            Add card
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
            Create a card in this binder. Search the Pokémon TCG catalog or
            enter details manually.
          </p>
        </header>
      </div>

      <CardForm
        binderId={b.id}
        initialValues={initialValues}
        scanEventId={scanEventId}
        cardLimitReached={cardLimitReached}
      />
    </div>
  );
}
