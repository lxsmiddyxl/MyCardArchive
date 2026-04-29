/**
 * Static Pokémon TCG "fandom" dimensions for profile identity — safe curated metadata only.
 */

export type FandomValueKind = "set" | "era" | "artist" | "character" | "theme";

/** Top-level facets shown in profile / identity settings. */
export type FandomDimensionMeta = {
  fandomId: string;
  displayName: string;
  description: string;
  /** Compact token for headings (emoji / symbol). */
  icon: string;
  valueType: FandomValueKind;
};

export const FANDOM_DIMENSIONS: FandomDimensionMeta[] = [
  {
    fandomId: "favorite_set",
    displayName: "Favorite set",
    description: "A Pokémon TCG expansion you keep coming back to.",
    icon: "◫",
    valueType: "set",
  },
  {
    fandomId: "favorite_era",
    displayName: "Favorite era",
    description: "The era whose print styles and sets you gravitate toward.",
    icon: "⏳",
    valueType: "era",
  },
  {
    fandomId: "favorite_artist",
    displayName: "Favorite artist",
    description: "The illustrator whose cards you hunt first.",
    icon: "🖌",
    valueType: "artist",
  },
  {
    fandomId: "favorite_character",
    displayName: "Favorite lineage / motif",
    description: "A species, mascot line, creature type, or collecting motif.",
    icon: "◎",
    valueType: "character",
  },
  {
    fandomId: "favorite_theme",
    displayName: "Favorite foil / frame",
    description: "A finish tier or rarity style — full arts, stamped promos, and more.",
    icon: "✦",
    valueType: "theme",
  },
];

export type FandomOption<T extends FandomValueKind = FandomValueKind> = {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  valueType: T;
};

/** Curated catalog set ids aligned with TCGdx-style slugs users may recognize. */
const SET_OPTIONS: FandomOption<"set">[] = [
  {
    id: "base1",
    displayName: "Base Set",
    description: "The original Pokémon TCG foundational run.",
    icon: "📕",
    valueType: "set",
  },
  { id: "neo1", displayName: "Neo Genesis", description: "Neo block opening chapter.", icon: "✨", valueType: "set" },
  { id: "ex1", displayName: "Ruby & Sapphire (EX)", description: "EX era kickoff.", icon: "💎", valueType: "set" },
  { id: "ecard1", displayName: "Expedition Base Set", description: "E-Card bordered era.", icon: "▭", valueType: "set" },
  { id: "dp1", displayName: "Diamond & Pearl", description: "DP-era core set.", icon: "◇", valueType: "set" },
  { id: "hw1", displayName: "HeartGold & SoulSilver", description: "HGSS relaunch nostalgia.", icon: "⚡", valueType: "set" },
  { id: "bw1", displayName: "Black & White", description: "BW reset-era flagship.", icon: "⚫", valueType: "set" },
  { id: "xy1", displayName: "XY", description: "Mega-era XY core.", icon: "✕", valueType: "set" },
  { id: "sm1", displayName: "Sun & Moon", description: "SM base set staples.", icon: "☀", valueType: "set" },
  { id: "swsh1", displayName: "Sword & Shield", description: "SWSH-era baseline.", icon: "🛡", valueType: "set" },
  { id: "swsh45sv", displayName: "Shining Fates", description: "Chase shiny subset era.", icon: "✶", valueType: "set" },
  { id: "swsh12pt5", displayName: "Crown Zenith", description: "High-energy SWSH capstone booster fun.", icon: "👑", valueType: "set" },
  { id: "sv1", displayName: "Scarlet & Violet", description: "SV series kickoff.", icon: "📗", valueType: "set" },
  { id: "sv2", displayName: "Paldea Evolved", description: "Paldea evolution showcase.", icon: "🌿", valueType: "set" },
  { id: "sv3", displayName: "Obsidian Flames", description: "Type-shift Charizard lore drop.", icon: "🔥", valueType: "set" },
  { id: "sv4", displayName: "Paradox Rift", description: "Paradox duo chase window.", icon: "⛈", valueType: "set" },
  { id: "pgo", displayName: "Pokémon GO", description: "AR crossover collaboration set.", icon: "📱", valueType: "set" },
  { id: "cel25", displayName: "Celebrations", description: "25th anniversary nostalgia hits.", icon: "🎂", valueType: "set" },
  { id: "sm75", displayName: "Dragon Majesty", description: "Dragon-focused mini set vibes.", icon: "🐉", valueType: "set" },
  { id: "sm8", displayName: "Lost Thunder", description: "Tag Team era chunk-of-set lore.", icon: "🌫", valueType: "set" },
  { id: "smp", displayName: "SM Promo", description: "Sun & Moon promotional lane.", icon: "☆", valueType: "set" },
];

const ERA_OPTIONS: FandomOption<"era">[] = [
  {
    id: "wotc_classic",
    displayName: "Wizards Base–Rocket",
    description: "Vintage Wizards printings through Team Rocket-era.",
    icon: "📼",
    valueType: "era",
  },
  { id: "neo_block", displayName: "Neo", description: "Neo Genesis through Revelation.", icon: "🌠", valueType: "era" },
  { id: "ecard_block", displayName: "e-Card", description: "E-reader bordered collectibles.", icon: "📇", valueType: "era" },
  { id: "ex_series", displayName: "EX / ADV", description: "EX block — Ruby–Emerald arcs.", icon: "💠", valueType: "era" },
  { id: "diamond_pearl", displayName: "Diamond & Pearl", description: "DP-era Sinnoh wave.", icon: "🔷", valueType: "era" },
  { id: "hgss_era", displayName: "HeartGold SoulSilver", description: "Johto alternate-art resurgence.", icon: "⚡", valueType: "era" },
  { id: "black_white_bw", displayName: "Black & White", description: "Unova reset print identity.", icon: "⚫", valueType: "era" },
  { id: "xy_mega_ex", displayName: "XY / Mega EX", description: "Mega-era holo identity.", icon: "✖", valueType: "era" },
  { id: "sun_moon_gx", displayName: "Sun & Moon GX", description: "SM rainbow texture era.", icon: "🌙", valueType: "era" },
  { id: "sword_shield", displayName: "Sword & Shield", description: "V / VMAX / VSTAR lane.", icon: "🛡", valueType: "era" },
  { id: "scarlet_violet", displayName: "Scarlet & Violet", description: "ex / Illustration rarity stack.", icon: "📚", valueType: "era" },
  { id: "jumbo_promo", displayName: "Jumbo / promo eras", description: "Oversized and league promo quirks.", icon: "📐", valueType: "era" },
  {
    id: "legendary_collections",
    displayName: "Legendary Collections",
    description: "Themed compilations — reverse holos and highlights.",
    icon: "🏛",
    valueType: "era",
  },
  { id: "platinum_arc", displayName: "Platinum / SP", description: "Rising Rivals-era SP gimmicks.", icon: "⚙", valueType: "era" },
  { id: "call_legends_wave", displayName: "Call of Legends HS", description: "CoL HS shiny slice.", icon: "📡", valueType: "era" },
];

const ARTIST_OPTIONS: FandomOption<"artist">[] = [
  { id: "mitsuhiro_arita", displayName: "Mitsuhiro Arita", description: "Iconic Pikachu and stage-set artwork.", icon: "🎯", valueType: "artist" },
  { id: "ken_sugimori", displayName: "Ken Sugimori", description: "Game-art lineage staples.", icon: "📝", valueType: "artist" },
  {
    id: "kouichi_oyama",
    displayName: "Kouichi Ooyama",
    description: "Striking watercolor textures.",
    icon: "🌊",
    valueType: "artist",
  },
  {
    id: "yuka_morisawa",
    displayName: "Yuka Morii",
    description: "Clay and sculpt-forward illustrations.",
    icon: "🏺",
    valueType: "artist",
  },
  { id: "sui_artist", displayName: "SUI", description: "Sleek monochrome drama.", icon: "⬛", valueType: "artist" },
  { id: "kagemaru_himeno", displayName: "Kagemaru Himeno", description: "Soft ethereal fantasy palettes.", icon: "☁️", valueType: "artist" },
  { id: "naoki_saito", displayName: "Naoki Saito", description: "Action-forward battle splash art.", icon: "⚔️", valueType: "artist" },
  { id: "hajime_kusajima", displayName: "Hajime Kusajima", description: "Neon-accented kinetic scenes.", icon: "🏙", valueType: "artist" },
  { id: "akira_egawa", displayName: "Akira Egawa", description: "Crisp anatomical heroic poses.", icon: "📐", valueType: "artist" },
  { id: "kirisAki", displayName: "KirisAki", description: "Cute stylized mascot lines.", icon: "🐾", valueType: "artist" },
  { id: "n_d_p_matsumoto", displayName: "n.d.m.t", description: "Painterly texture experiments.", icon: "🖼", valueType: "artist" },
  { id: "yuya_ohta", displayName: "Yuya Ohta", description: "Metallic shading highlights.", icon: "✴️", valueType: "artist" },
  { id: "ryuta_fuji", displayName: "Ryuta Fuse", description: "Macro creature drama.", icon: "🔭", valueType: "artist" },
  { id: "saya_tsuruta", displayName: "saya Tsuruta", description: "Soft scenic backgrounds.", icon: "🍃", valueType: "artist" },
  {
    id: "sowsow",
    displayName: "sowsow",
    description: "Chibi mascot charm across modern promos.",
    icon: "🌸",
    valueType: "artist",
  },
  { id: "hyogonosuke", displayName: "HYOGONOSUKE", description: "Bold gouache-esque shapes.", icon: "🌀", valueType: "artist" },
  { id: "teeziro", displayName: "Teeziro", description: "Crisp mascot silhouettes.", icon: "🍙", valueType: "artist" },
  { id: "akira_egg_lab", displayName: "AKIRA EGG", description: "CG-meets-traditional fusion.", icon: "🖥️", valueType: "artist" },
  { id: "5ban_graphics", displayName: "5ban Graphics", description: "Studio holographic overlays.", icon: "📺", valueType: "artist" },
  { id: "yusuke_kozaki_style", displayName: "Yusuke Kozaki-inspired", description: "Sharp fashion-forward ink lines.", icon: "👔", valueType: "artist" },
  { id: "shibuzoh", displayName: "Shibuzoh.", description: "Whimsical storybook spreads.", icon: "📘", valueType: "artist" },
  {
    id: "asako_itou",
    displayName: "Asako Ito",
    description: "Cozy domestic Trainer × Pokémon vignettes.",
    icon: "☕",
    valueType: "artist",
  },
  { id: "kyoko_umemoto_lite", displayName: "Kyoko Umemoto lineage", description: "Floral ethereal staging.", icon: "🌷", valueType: "artist" },
  { id: "cg_studio_line", displayName: "Publisher CG studio renders", description: "Promo-render clarity lines.", icon: "📷", valueType: "artist" },
];

const CHARACTER_OPTIONS: FandomOption<"character">[] = [
  { id: "charizard_line", displayName: "Charizard line", description: "Starters’ fire-dragon mascot arc.", icon: "🐲", valueType: "character" },
  { id: "pikachu_mascots", displayName: "Pikachu cosplay tribe", description: "Mascots, promos, and surf variants.", icon: "⚡", valueType: "character" },
  { id: "eevee_lab", displayName: "Eeveelutions", description: "Eevee branching evolutions binder.", icon: "🦊", valueType: "character" },
  { id: "lucario_myth", displayName: "Lucario lineage", description: "Aura guardian fantasy.", icon: "🥋", valueType: "character" },
  { id: "gengar_mischief", displayName: "Gengar & ghosts", description: "Haunter-to-Gengar ghost tricksters.", icon: "👻", valueType: "character" },
  { id: "dragon_tcg", displayName: "Dragons", description: "Colorless Dragon-type chase cards.", icon: "🪽", valueType: "character" },
  { id: "fossils", displayName: "Fossils", description: "Kabuto tribe and ancient-rock themes.", icon: "🪨", valueType: "character" },
  { id: "mew_mythic", displayName: "Mew lineage", description: "Mythical pink chase cards.", icon: "💖", valueType: "character" },
  {
    id: "ray_quaza_story",
    displayName: "Rayquaza / weather trio",
    description: "Emerald mascot-level Sky High chase.",
    icon: "🌀",
    valueType: "character",
  },
  { id: "umbreon_espeon", displayName: "Umbreon × Espeon", description: "Eon night-day moon-sun duel.", icon: "🌙", valueType: "character" },
  { id: "gardevoir_fan", displayName: "Gardevoir / Ralts line", description: "Psychic elegance collectors.", icon: "💃", valueType: "character" },
  { id: "lapras_wave", displayName: "Lapras voyages", description: "Calm icy transport motif.", icon: "🌊", valueType: "character" },
  { id: "snorlax_lazy", displayName: "Snorlax club", description: "Blocker-beam mascot moments.", icon: "😴", valueType: "character" },
  { id: "gyarados_rage", displayName: "Gyarados arc", description: "Serpent rage evolution story.", icon: "🐉", valueType: "character" },
  {
    id: "legendary_beasts_sg",
    displayName: "Legendary beasts",
    description: "Raikou Suicune Entei trio chase binder.",
    icon: "🐕",
    valueType: "character",
  },
  { id: "tyranitar_line", displayName: "Pupitar line", description: "Rock-dark intimidation arcs.", icon: "🪓", valueType: "character" },
  { id: "porygon_stack", displayName: "Porygon digital", description: "Retro polygon promo oddities.", icon: "💠", valueType: "character" },
  {
    id: "psyduck_meme",
    displayName: "Psyduck club",
    description: "Comic headache duck spotlight.",
    icon: "😵",
    valueType: "character",
  },
  { id: "magikarp_wave", displayName: "Magikarp club", description: "Zero-to-hero gag chase.", icon: "🐟", valueType: "character" },
  { id: "team_rocket_always", displayName: "Team Rocket theatricals", description: "Villains with style.", icon: "🎭", valueType: "character" },
  { id: "lugia_hooh_arcs", displayName: "Lugia / Ho-Oh arcs", description: "Silver-gold mascot birds.", icon: "🪽", valueType: "character" },
  { id: "dedenne_mic", displayName: "Dedenne mascot", description: "Tiny cheek-electric mascot.", icon: "🎙", valueType: "character" },
  { id: "sprig_mascot_line", displayName: "Starter trios binders", description: "Grass-fire-water mascot collecting.", icon: "📗", valueType: "character" },
  {
    id: "paradox_pkmn",
    displayName: "Paradox critters",
    description: "Future / past paradox silhouettes.",
    icon: "⏾",
    valueType: "character",
  },
  { id: "pika_teamups", displayName: "Trainer gallery pairings", description: "Full-art Trainer + Pokémon combos.", icon: "🖼️", valueType: "character" },
];

const THEME_OPTIONS: FandomOption<"theme">[] = [
  { id: "full_art", displayName: "Full art Trainer / Pokémon", description: "Edge-to-edge textured artwork.", icon: "🖼", valueType: "theme" },
  { id: "alt_art_secret", displayName: "Alt art secrets", description: "Sequence-number secret rare showcases.", icon: "🔮", valueType: "theme" },
  { id: "special_illustration", displayName: "Special Illustration Rare", description: "SIR textured chase tier.", icon: "✒️", valueType: "theme" },
  { id: "rainbow_full", displayName: "Rainbow Rare", description: "Gradient foil hyper-rare overlays.", icon: "🌈", valueType: "theme" },
  { id: "gold_secret", displayName: "Gold secret cards", description: "Metallic etched gold frames.", icon: "🏆", valueType: "theme" },
  { id: "vmax_gx_block", displayName: "VMAX / GX focus", description: "Giant-hitpoint era chase cards.", icon: "⚡", valueType: "theme" },
  { id: "vstar_mechanics", displayName: "VSTAR / radiant", description: "Rule-box power counters & radiants.", icon: "⭐️", valueType: "theme" },
  {
    id: "reverse_holo",
    displayName: "Reverse Holo commons",
    description: "Set filler shine when building grids.",
    icon: "🔁",
    valueType: "theme",
  },
  { id: "stamped_promo", displayName: "Prerelease / stamped", description: "League & box stamp collectibles.", icon: "📮", valueType: "theme" },
  { id: "prism_star", displayName: "Prism Star", description: "One-of restricted sparkle era.", icon: "💎", valueType: "theme" },
  { id: "ace_spec", displayName: "ACE SPEC / BREAK", description: "Rules-text chase mechanic oddities.", icon: "⚙️", valueType: "theme" },
  { id: "jumbo_bonus", displayName: "Jumbo / box promos", description: "Oversized memorabilia.", icon: "📏", valueType: "theme" },
  {
    id: "cosmos_holo",
    displayName: "Cosmos / galaxy holo",
    description: "Swirl-pattern holofoil chase.",
    icon: "🌌",
    valueType: "theme",
  },
];

const OPT_BY_KIND: Record<FandomValueKind, FandomOption[]> = {
  set: [...SET_OPTIONS],
  era: [...ERA_OPTIONS],
  artist: ARTIST_OPTIONS,
  character: CHARACTER_OPTIONS,
  theme: THEME_OPTIONS,
};

const ALL_OPT: FandomOption[] = [
  ...OPT_BY_KIND.set,
  ...OPT_BY_KIND.era,
  ...OPT_BY_KIND.artist,
  ...OPT_BY_KIND.character,
  ...OPT_BY_KIND.theme,
];

const BY_KIND_ID = new Map<string, FandomOption>();

for (const o of ALL_OPT) {
  BY_KIND_ID.set(`${o.valueType}:${o.id}`, o);
}

/** All option ids for a facet (subset of catalog set ids listed above). */
export function listFandomOptions(kind?: FandomValueKind): FandomOption[] {
  if (!kind) return [...ALL_OPT];
  return [...OPT_BY_KIND[kind]];
}

export function getFandomOptionById(kind: FandomValueKind, id: string | null | undefined): FandomOption | null {
  const t = (id ?? "").trim();
  if (!t) return null;
  return BY_KIND_ID.get(`${kind}:${t}`) ?? null;
}

/** Flair key for a curated option (never store arbitrary slashes). */
export function fandomFlairKey(kind: Exclude<FandomValueKind, never>, slug: string): string {
  const s = slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return `fandom_${kind}_${s}`;
}

/**
 * Canonical ordering for flair priority block (after collection value tiers, before shop).
 * Order within group: preserves catalog array order above.
 */
export function listAllOrderedFandomFlairKeys(): string[] {
  const keys: string[] = [];
  for (const kind of ["set", "era", "artist", "character", "theme"] as const) {
    for (const opt of OPT_BY_KIND[kind]) {
      keys.push(fandomFlairKey(kind, opt.id));
    }
  }
  return keys;
}

/** Wildcard-compatible flair suffix for lookups (unknown user-picked catalog set id still gets a key). */
export function flairKeyForFavoriteSet(setId: string | null | undefined): string | null {
  const t = (setId ?? "").trim();
  if (!t) return null;
  return fandomFlairKey("set", t);
}
