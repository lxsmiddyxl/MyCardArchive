import type { MarketplaceListingV3DTO } from "@/lib/dto/marketplace-v3";

export type ValueSignalV2Tone = "high_interest" | "steady" | "low_activity";

export type ValueSignalV2DTO = {
  catalogCardId: string;
  interestVelocity: number;
  tradeDesirability: number;
  tone: ValueSignalV2Tone;
  hint: string;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function interestVelocityFromListings(
  want: MarketplaceListingV3DTO[],
  offer: MarketplaceListingV3DTO[],
  catalogCardId: string
): number {
  const w = want.find((x) => x.catalog_card_id === catalogCardId);
  const o = offer.find((x) => x.catalog_card_id === catalogCardId);
  const wantScore = w ? Math.min(1, (w.collector_count * 0.12 + w.card_count * 0.04) / 8) : 0;
  const offerScore = o ? Math.min(1, (o.collector_count * 0.1 + o.card_count * 0.05) / 7) : 0;
  return clamp01(wantScore * 0.62 + offerScore * 0.38);
}

export function tradeDesirabilityFromListings(
  want: MarketplaceListingV3DTO[],
  offer: MarketplaceListingV3DTO[],
  catalogCardId: string
): number {
  const w = want.find((x) => x.catalog_card_id === catalogCardId);
  const o = offer.find((x) => x.catalog_card_id === catalogCardId);
  if (!w && !o) return 0;
  const imbalance = w && o ? Math.abs(w.collector_count - o.collector_count) : (w?.collector_count ?? o?.collector_count ?? 0);
  const balance = clamp01(1 - imbalance / 12);
  const depth = clamp01(((w?.card_count ?? 0) + (o?.card_count ?? 0)) / 24);
  return clamp01(balance * 0.55 + depth * 0.45);
}

export function toneFromSignals(velocity: number, desirability: number): ValueSignalV2Tone {
  const blend = velocity * 0.55 + desirability * 0.45;
  if (blend >= 0.62) return "high_interest";
  if (blend >= 0.28) return "steady";
  return "low_activity";
}

export function hintForTone(tone: ValueSignalV2Tone): string {
  switch (tone) {
    case "high_interest":
      return "High interest — collectors are actively discussing trades for this card.";
    case "steady":
      return "Steady — balanced want/offer activity in the network.";
    default:
      return "Low activity — few recent qualitative signals.";
  }
}

export function buildValueSignalsV2(
  want: MarketplaceListingV3DTO[],
  offer: MarketplaceListingV3DTO[],
  limit = 24
): ValueSignalV2DTO[] {
  const ids = new Set<string>();
  for (const row of [...want, ...offer]) ids.add(row.catalog_card_id);
  const out: ValueSignalV2DTO[] = [];
  for (const catalogCardId of ids) {
    const interestVelocity = interestVelocityFromListings(want, offer, catalogCardId);
    const tradeDesirability = tradeDesirabilityFromListings(want, offer, catalogCardId);
    const tone = toneFromSignals(interestVelocity, tradeDesirability);
    out.push({
      catalogCardId,
      interestVelocity,
      tradeDesirability,
      tone,
      hint: hintForTone(tone),
    });
  }
  out.sort((a, b) => b.interestVelocity + b.tradeDesirability - (a.interestVelocity + a.tradeDesirability));
  return out.slice(0, limit);
}
