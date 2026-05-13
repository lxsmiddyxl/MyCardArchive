import type { MarketplaceListingV3DTO } from "@/lib/dto/marketplace-v3";
import { mapDiscoveryJsonToCardsV3 } from "@/lib/marketplace/v3-mappers";

export type CardTrendV3DTO = {
  catalog_card_id: string;
  label: "rising_interest" | "steady" | "cooling";
  /** 0–1 qualitative blend — not a price. */
  relative_velocity: number;
  appearance_frequency: number;
  trade_energy: number;
  caption: string;
};

export function trendFromDiscoverySlices(
  catalogCardId: string,
  want: MarketplaceListingV3DTO[],
  offer: MarketplaceListingV3DTO[]
): CardTrendV3DTO {
  const w = want.find((x) => x.catalog_card_id === catalogCardId);
  const o = offer.find((x) => x.catalog_card_id === catalogCardId);
  const appearance_frequency = (w?.collector_count ?? 0) + (o?.collector_count ?? 0);
  const trade_energy = (w?.card_count ?? 0) + (o?.card_count ?? 0);
  const relative_velocity = Math.min(1, Math.log1p(appearance_frequency * 1.4 + trade_energy * 0.6) / 5.2);
  let label: CardTrendV3DTO["label"] = "steady";
  if (relative_velocity >= 0.62) label = "rising_interest";
  else if (relative_velocity <= 0.28) label = "cooling";
  const caption =
    label === "rising_interest"
      ? "Rising hobby interest — more collectors flagging this card."
      : label === "cooling"
        ? "Cooling signal — fewer active marketplace flags recently."
        : "Steady rotation — typical mix of looking-for and for-trade energy.";
  return {
    catalog_card_id: catalogCardId,
    label,
    relative_velocity,
    appearance_frequency,
    trade_energy,
    caption,
  };
}

export function trendFromDiscoveryJson(catalogCardId: string, discoveryJson: unknown): CardTrendV3DTO {
  const mapped = mapDiscoveryJsonToCardsV3(discoveryJson);
  return trendFromDiscoverySlices(catalogCardId, mapped.want_by_catalog, mapped.offer_by_catalog);
}
