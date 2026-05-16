export type CollectionStrengthCategory = "emerging" | "established" | "elite";

export type CollectionStrengthDTO = {
  category: CollectionStrengthCategory;
  label: string;
  hint: string;
};

export type CollectionStrengthInputs = {
  uniqueCards: number;
  binderCount: number;
  showcaseCount: number;
  tradesCompleted: number;
  rarityScore: number;
};

export function collectionStrengthCategory(input: CollectionStrengthInputs): CollectionStrengthDTO {
  const depth =
    Math.min(1, input.uniqueCards / 450) * 0.35 +
    Math.min(1, input.binderCount / 12) * 0.2 +
    Math.min(1, input.showcaseCount / 6) * 0.15 +
    Math.min(1, input.tradesCompleted / 24) * 0.15 +
    Math.min(1, input.rarityScore) * 0.15;

  let category: CollectionStrengthCategory = "emerging";
  if (depth >= 0.72) category = "elite";
  else if (depth >= 0.38) category = "established";

  const labels: Record<CollectionStrengthCategory, { label: string; hint: string }> = {
    emerging: {
      label: "Emerging collection",
      hint: "Building depth — keep adding binders, trades, and showcase highlights.",
    },
    established: {
      label: "Established collection",
      hint: "Solid breadth across binders and trades — collectors notice your consistency.",
    },
    elite: {
      label: "Elite collection",
      hint: "Standout depth and activity — a reference point in the network.",
    },
  };

  return { category, ...labels[category] };
}
