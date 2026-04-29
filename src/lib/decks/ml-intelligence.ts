/**
 * Deterministic, model-shaped deck hints until a remote ML endpoint is wired.
 * Uses aggregate deck stats already loaded in the editor.
 */

export type DeckMlIntelligence = {
  synergyScore: number;
  suggestedAdds: string[];
  weaknessWarnings: string[];
};

const COUNTER_HINT: Record<string, string> = {
  grass: "Fire",
  fire: "Water",
  water: "Lightning",
  lightning: "Fighting",
  psychic: "Darkness",
  fighting: "Psychic",
  darkness: "Grass",
  metal: "Fire",
  fairy: "Metal",
  dragon: "Fairy",
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeDeckMlIntelligence(input: {
  totalCards: number;
  typeDistribution: Record<string, number> | null | undefined;
  colorIdentity: string[];
}): DeckMlIntelligence {
  const dist = input.typeDistribution ?? {};
  const trainerish =
    (dist["Trainer"] ?? 0) +
    (dist["trainer"] ?? 0) +
    (dist["Supporter"] ?? 0) +
    (dist["Item"] ?? 0);
  const pokemonish =
    (dist["Pokémon"] ?? 0) + (dist["Pokemon"] ?? 0) + (dist["Basic"] ?? 0) + (dist["Stage 1"] ?? 0);

  const suggestedAdds: string[] = [];
  if (input.totalCards >= 18 && trainerish < 10) {
    suggestedAdds.push("Add draw and search Trainers (Supporters, Items) so your Pokémon lines stay consistent.");
  }
  if (input.totalCards >= 18 && pokemonish > 0 && pokemonish / Math.max(input.totalCards, 1) > 0.65) {
    suggestedAdds.push("Balance Pokémon density with utility Trainers — lists above ~65% Pokémon often run out of steam.");
  }
  if (Object.keys(dist).length > 0 && (dist["Energy"] ?? 0) + (dist["energy"] ?? 0) < 8 && input.totalCards >= 30) {
    suggestedAdds.push("Review Energy count versus your attack costs — full lists often need a tuned Energy suite.");
  }

  const diversity = input.colorIdentity.length;
  const baseSynergy = 38 + diversity * 9 + clamp(trainerish, 0, 22) * 1.1;
  const synergyScore = Math.round(clamp(baseSynergy, 12, 97));

  const weaknessWarnings: string[] = [];
  if (input.colorIdentity.length === 1) {
    const t = input.colorIdentity[0]?.toLowerCase() ?? "";
    const counter = COUNTER_HINT[t];
    if (counter) {
      weaknessWarnings.push(
        `Mono-${input.colorIdentity[0]} — watch for ${counter}-type pressure and spread attackers in the metagame.`
      );
    } else {
      weaknessWarnings.push("Single-type focus can be exploited — keep a plan for unfavorable matchups.");
    }
  }
  if (trainerish < 6 && input.totalCards >= 24) {
    weaknessWarnings.push("Low Trainer density — hands may brick; prioritize consistency before raw Pokémon power.");
  }

  return {
    synergyScore,
    suggestedAdds: suggestedAdds.slice(0, 5),
    weaknessWarnings: weaknessWarnings.slice(0, 4),
  };
}
