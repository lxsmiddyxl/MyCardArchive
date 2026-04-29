import type { NormalizedCard } from "@/lib/ai/normalize-card";
import type {
  AutoMatchCandidate,
  AutoMatchResult,
} from "@/lib/types/auto-match";

const W_REVERSE = 0.6;
const W_SET = 0.3;
const W_AI = 0.1;
const CATALOG_BOOST = 0.1;

function clamp01(x: number): number {
  if (typeof x !== "number" || !Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}

function setAlignmentWithId(
  detected: { set_name: string; confidence: number },
  candidateSet: string,
  candidateSetId?: string | null
): number {
  const base = setAlignment(detected, candidateSet);
  if (candidateSetId && candidateSetId.trim()) {
    return Math.min(1, base + 0.05);
  }
  return base;
}

function setAlignment(
  detected: { set_name: string; confidence: number },
  candidateSet: string
): number {
  const a = detected.set_name.trim().toLowerCase();
  const b = candidateSet.trim().toLowerCase();
  if (!a || a === "unknown") {
    return 0.45;
  }
  if (!b) {
    return 0.35;
  }
  if (a === b) {
    return 1;
  }
  if (a.includes(b) || b.includes(a)) {
    return 0.82;
  }
  return 0.22;
}

function aiAlignment(ai: NormalizedCard, cand: AutoMatchCandidate): number {
  const an = ai.name.trim().toLowerCase();
  const cn = cand.card_name.trim().toLowerCase();
  let score = 0.25;
  if (an && cn) {
    if (an === cn) {
      score = 1;
    } else if (cn.includes(an) || an.includes(cn)) {
      score = 0.72;
    }
  }
  const numA = ai.number.trim();
  const numB = cand.number.trim();
  if (
    numA.length > 0 &&
    numB.length > 0 &&
    numA === numB &&
    numB !== "—"
  ) {
    score = Math.max(score, 0.85);
  }
  return score;
}

function sanitizeCandidate(c: AutoMatchCandidate): AutoMatchCandidate {
  return {
    card_name: String(c.card_name ?? "").trim() || "Unknown",
    set_name: String(c.set_name ?? "").trim() || "Unknown",
    number: String(c.number ?? "").trim() || "—",
    rarity:
      c.rarity != null && String(c.rarity).trim()
        ? String(c.rarity).trim()
        : null,
    image_url:
      typeof c.image_url === "string" && c.image_url.trim()
        ? c.image_url.trim()
        : null,
    confidence: clamp01(Number(c.confidence)),
    catalog_card_id: c.catalog_card_id ?? null,
    set_id: c.set_id ?? null,
  };
}

/**
 * Merges catalog / reverse-image candidates with set detection and AI normalization.
 * Catalog-backed rows get a scoring boost and sort ahead of AI-only guesses.
 * Never throws.
 */
export function combineAutoMatch(
  aiNormalized: NormalizedCard,
  reverseMatches: AutoMatchCandidate[],
  setDetection: { set_name: string; confidence: number }
): AutoMatchResult {
  try {
    const setDet = {
      set_name: String(setDetection?.set_name ?? "").trim() || "Unknown",
      confidence: clamp01(Number(setDetection?.confidence)),
    };

    const hits = Array.isArray(reverseMatches) ? reverseMatches : [];
    const combined: AutoMatchCandidate[] = [];

    for (const raw of hits) {
      const base = sanitizeCandidate(raw);
      const revLeg = clamp01(base.confidence);
      const setLeg =
        clamp01(setDet.confidence) *
        setAlignmentWithId(setDet, base.set_name, base.set_id);
      const aiLeg = aiAlignment(aiNormalized, base);
      const cat =
        base.catalog_card_id != null && base.catalog_card_id !== ""
          ? CATALOG_BOOST
          : 0;
      const confidence = clamp01(
        W_REVERSE * revLeg + W_SET * setLeg + W_AI * aiLeg + cat
      );
      combined.push({
        ...base,
        confidence,
      });
    }

    if (combined.length === 0) {
      const aiHasName = aiNormalized.name.trim().length > 0;
      const setScore = setDet.confidence;
      if (aiHasName || setScore > 0.05) {
        const aiLeg = aiHasName ? 0.75 : 0.2;
        const setLeg =
          setScore > 0.05
            ? setAlignment(setDet, setDet.set_name) * setScore
            : 0.25;
        const confidence = clamp01(
          W_REVERSE * 0.28 + W_SET * setLeg + W_AI * aiLeg
        );
        combined.push({
          card_name: aiNormalized.name.trim() || "Unknown",
          set_name: setDet.set_name,
          number: aiNormalized.number.trim() || "—",
          rarity: aiNormalized.rarity.trim() || null,
          image_url: aiNormalized.image_url,
          confidence,
          catalog_card_id: null,
          set_id: null,
        });
      }
    }

    combined.sort((a, b) => {
      const ha = a.catalog_card_id ? 1 : 0;
      const hb = b.catalog_card_id ? 1 : 0;
      if (ha !== hb) return hb - ha;
      return b.confidence - a.confidence;
    });

    const matches = combined.map(sanitizeCandidate);
    const best_match = matches.length > 0 ? matches[0]! : null;

    return { matches, best_match };
  } catch {
    return { matches: [], best_match: null };
  }
}
