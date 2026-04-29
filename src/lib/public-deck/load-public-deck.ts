import {
  computeLegality,
  normalizeDeckFormat,
  type DeckCardRow,
} from "@/lib/decks/legality-compute";
import { logServerError } from "@/lib/server/observability";
import { tryCreateAnonServerClient } from "@/lib/supabase/anon-server";
import type { Json } from "@/lib/supabase/types";

export type PublicDeckCard = {
  card_id: string;
  quantity: number;
  section: string;
  name: string;
  image_url: string | null;
  rarity: string | null;
  number: string | null;
  /** Present when the source `cards` row links to the catalog (export / binder copy). */
  catalog_card_id: string | null;
};

export type PublicDeckPayload = {
  deck: {
    id: string;
    name: string;
    description: string;
    format: string;
    created_at: string;
    updated_at: string;
    type_distribution: Record<string, number> | null;
    rarity_distribution: Record<string, number> | null;
    set_distribution: Record<string, number> | null;
    estimated_value: number | string | null;
    top_cards:
      | {
          id: string;
          name: string;
          image_url: string | null;
          price: number | null;
        }[]
      | null;
  };
  deck_stats: {
    color_identity: string[];
    total_cards: number;
    unique_cards: number;
    legality_status: string;
    synergy_score: number;
  };
  cards: {
    main: PublicDeckCard[];
    sideboard: PublicDeckCard[];
    commander: PublicDeckCard[];
  };
  legality: {
    format: string;
    legal: boolean;
    issues: { card_id: string; name: string; reason: string }[];
  };
  owner_display_name: string;
  /** Deck owner auth id — safe for public decks; used for “open in editor” / ownership UI. */
  owner_user_id: string;
  hero: { name: string; image_url: string | null } | null;
};

type GatePayload = { status: string };

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function jsonRecord(val: Json | null | undefined): Record<string, number> | null {
  if (!val || typeof val !== "object" || Array.isArray(val)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(val)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

function topCardsFromJson(val: Json | null | undefined): PublicDeckPayload["deck"]["top_cards"] {
  if (!Array.isArray(val)) return null;
  const rows: NonNullable<PublicDeckPayload["deck"]["top_cards"]> = [];
  for (const item of val) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const name = typeof o.name === "string" ? o.name : "";
    if (!id || !name) continue;
    const image_url = typeof o.image_url === "string" ? o.image_url : null;
    const price = typeof o.price === "number" && Number.isFinite(o.price) ? o.price : null;
    rows.push({ id, name, image_url, price });
  }
  return rows.length ? rows : null;
}

export async function loadPublicDeck(deckId: string): Promise<
  | { ok: true; data: PublicDeckPayload }
  | { ok: false; status: 404 }
  | { ok: false; status: 403 }
  | { ok: false; status: 500; message: string }
> {
  const id = deckId?.trim();
  if (!id) {
    return { ok: false, status: 404 };
  }

  const supabase = tryCreateAnonServerClient();
  if (!supabase) {
    logServerError({
      scope: "ssr",
      route: "/d/[deckId]",
      err: "Supabase anon client unavailable (check NEXT_PUBLIC_SUPABASE_* env)",
    });
    return { ok: false, status: 404 };
  }

  try {
  const { data: gateRaw, error: gateErr } = await supabase.rpc("get_public_deck_gate", {
    p_deck_id: id,
  });

  if (gateErr) {
    logServerError({ scope: "ssr", route: "/d/[deckId]", err: gateErr });
    return { ok: false, status: 404 };
  }

  const gate = gateRaw as GatePayload | null;
  const status = gate?.status;
  if (status === "not_found") return { ok: false, status: 404 };
  if (status === "forbidden") return { ok: false, status: 403 };
  if (status !== "ok") {
    return { ok: false, status: 500, message: "Unexpected gate response" };
  }

  const { data: deckRow, error: deckErr } = await supabase
    .from("decks")
    .select(
      "id, user_id, name, description, format, created_at, updated_at, type_distribution, rarity_distribution, set_distribution, estimated_value, top_cards"
    )
    .eq("id", id)
    .maybeSingle();

  if (deckErr) {
    logServerError({ scope: "ssr", route: "/d/[deckId]", err: deckErr });
    return { ok: false, status: 404 };
  }
  if (!deckRow) {
    return { ok: false, status: 404 };
  }

  const { data: statsRow, error: statsErr } = await supabase
    .from("deck_stats")
    .select("color_identity, total_cards, unique_cards, legality_status, synergy_score")
    .eq("deck_id", id)
    .maybeSingle();

  if (statsErr) {
    logServerError({ scope: "ssr", route: "/d/[deckId]", err: statsErr });
  }

  const { data: ownerName, error: ownerErr } = await supabase.rpc(
    "get_public_deck_owner_display",
    { p_deck_id: id }
  );

  if (ownerErr) {
    logServerError({ scope: "ssr", route: "/d/[deckId]", err: ownerErr });
  }

  const ownerDisplayRaw = ownerErr ? null : ownerName;
  const ownerDisplayName =
    typeof ownerDisplayRaw === "string"
      ? ownerDisplayRaw.trim() || "Anonymous"
      : "Anonymous";

  const { data: cardRows, error: cardsErr } = await supabase
    .from("deck_cards")
    .select(
      `
      card_id,
      quantity,
      section,
      cards (
        id,
        name,
        image_url,
        rarity,
        number,
        catalog_card_id,
        catalog_cards (
          id,
          name,
          supertype,
          subtypes,
          legal_standard,
          legal_expanded,
          legal_unlimited,
          legal_commander
        )
      )
    `
    )
    .eq("deck_id", id);

  if (cardsErr) {
    logServerError({ scope: "ssr", route: "/d/[deckId]", err: cardsErr });
  }

  const safeCardRows = cardsErr ? [] : (cardRows ?? []);

  const zones: PublicDeckPayload["cards"] = {
    main: [],
    sideboard: [],
    commander: [],
  };

  const legalityRows: DeckCardRow[] = [];

  for (const row of safeCardRows) {
    const r = row as {
      card_id: string;
      quantity: number | null;
      section: string | null;
      cards: unknown;
    };
    const qty = Math.max(0, Number(r.quantity) || 0);
    const cardNested = firstRelation(
      r.cards as {
        id: string;
        name: string;
        image_url: string | null;
        rarity: string | null;
        number: string | null;
        catalog_card_id: string | null;
        catalog_cards: unknown;
      } | null
    );
    if (cardNested) {
      const sectionNorm = (r.section ?? "main").trim() || "main";
      legalityRows.push({
        card_id: r.card_id,
        quantity: qty,
        section: sectionNorm,
        cards: {
          id: cardNested.id,
          name: cardNested.name ?? "Card",
          catalog_card_id: cardNested.catalog_card_id ?? null,
          catalog_cards: cardNested.catalog_cards as DeckCardRow["cards"],
        },
      } as DeckCardRow);
      const zone = sectionNorm.toLowerCase() as keyof typeof zones;
      const entry: PublicDeckCard = {
        card_id: r.card_id,
        quantity: qty,
        section: sectionNorm,
        name: (cardNested.name && String(cardNested.name)) || "Card",
        image_url: cardNested.image_url,
        rarity: cardNested.rarity,
        number: cardNested.number,
        catalog_card_id: cardNested.catalog_card_id ?? null,
      };
      if (zone in zones) {
        zones[zone].push(entry);
      } else {
        zones.main.push(entry);
      }
    }
  }

  const format = normalizeDeckFormat(deckRow.format);
  let legal = true;
  let issues: PublicDeckPayload["legality"]["issues"] = [];
  try {
    ({ legal, issues } = computeLegality(format, legalityRows));
  } catch (legErr) {
    logServerError({ scope: "ssr", route: "/d/[deckId]", err: legErr });
    issues = [];
    legal = true;
  }

  const deck = deckRow;

  let hero: PublicDeckPayload["hero"] = null;
  for (const c of zones.main) {
    if (c.image_url) {
      hero = { name: c.name, image_url: c.image_url };
      break;
    }
  }
  if (!hero && zones.main.length > 0) {
    hero = { name: zones.main[0]!.name, image_url: zones.main[0]!.image_url };
  }
  if (!hero && zones.commander.length > 0) {
    const c = zones.commander[0]!;
    hero = { name: c.name, image_url: c.image_url };
  }

  const stats = (statsErr ? null : statsRow) ?? {
    color_identity: [] as string[],
    total_cards: 0,
    unique_cards: 0,
    legality_status: "unknown",
    synergy_score: 0,
  };

  const payload: PublicDeckPayload = {
    deck: {
      id: deck.id,
      name: (deck.name && String(deck.name).trim()) || "Untitled",
      description: deck.description != null ? String(deck.description) : "",
      format: (deck.format && String(deck.format).trim()) || "standard",
      created_at: deck.created_at != null ? String(deck.created_at) : "",
      updated_at: deck.updated_at != null ? String(deck.updated_at) : "",
      type_distribution: jsonRecord(deck.type_distribution),
      rarity_distribution: jsonRecord(deck.rarity_distribution),
      set_distribution: jsonRecord(deck.set_distribution),
      estimated_value: deck.estimated_value,
      top_cards: topCardsFromJson(deck.top_cards),
    },
    deck_stats: {
      color_identity: Array.isArray(stats.color_identity)
        ? stats.color_identity.map((x) => String(x))
        : [],
      total_cards: Math.max(0, Number(stats.total_cards) || 0),
      unique_cards: Math.max(0, Number(stats.unique_cards) || 0),
      legality_status:
        typeof stats.legality_status === "string" && stats.legality_status.length > 0
          ? stats.legality_status
          : "unknown",
      synergy_score: Math.max(0, Number(stats.synergy_score) || 0),
    },
    cards: zones,
    legality: {
      format,
      legal,
      issues,
    },
    owner_display_name: ownerDisplayName,
    owner_user_id: String(deckRow.user_id ?? ""),
    hero,
  };

  return { ok: true, data: payload };
  } catch (err) {
    logServerError({
      scope: "ssr",
      route: "loadPublicDeck",
      err,
    });
    return { ok: false, status: 404 };
  }
}
