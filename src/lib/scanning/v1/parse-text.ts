import type { ScanV1ExtractedText } from "@/lib/scanning/types";

const NOISE = new Set(
  [
    "HP",
    "Pokémon",
    "Pokemon",
    "CARD",
    "WEAKNESS",
    "RESISTANCE",
    "RETREAT",
    "BASIC",
    "STAGE",
    "STAGE1",
    "STAGE2",
    "LEVEL",
    "GX",
    "EX",
    "VMAX",
    "VSTAR",
    "V-UNION",
    "LEGEND",
    "PRISM",
    "TAG",
    "TEAM",
    "ITEM",
    "SUPPORTER",
    "STADIUM",
    "ENERGY",
    "TOOL",
    "TRAINER",
    "ILLUS",
    "ILLUS.",
    "©",
    "WIZARDS",
    "NINTENDO",
    "TCG",
    "HOLO",
    "RARE",
    "UNCOMMON",
    "COMMON",
    "NM",
    "LP",
    "MP",
    "HP",
  ].map((s) => s.toUpperCase())
);

/** Printed codes that appear on vintage English Pokémon products — boosts set_code guess. */
const KNOWN_SET_CODE_HINTS = new Set([
  "BASE",
  "JU",
  "FO",
  "BG",
  "TR",
  "PR",
  "SI",
  "RO",
  "N1",
  "N2",
  "N3",
  "N4",
  "E1",
  "EX",
  "SV",
  "SWSH",
  "SM",
  "XY",
  "BW",
  "HGSS",
  "CL",
]);

function normLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function splitLines(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map(normLine)
    .filter((l) => l.length > 1);
  const out: string[] = [];
  for (const l of lines) {
    if (!out.length || out[out.length - 1] !== l) {
      out.push(l);
    }
  }
  return out;
}

function scoreNameCandidate(line: string): number {
  const L = line.trim();
  if (L.length < 3 || L.length > 44) return -1;
  if (/^\d+$/.test(L)) return -1;
  if (/\d\s*\/\s*\d/.test(L)) return -1;
  if (/^HP\s*\d/i.test(L)) return -1;
  if (/weakness|resistance|retreat|illustrator|illustrated|©|all rights/i.test(L)) return -1;
  if (/evolves\s+from/i.test(L)) return -1;
  if (/^put\s+/i.test(L)) return -1;
  const upper = L.toUpperCase();
  if (NOISE.has(upper)) return -1;
  if (!/[A-Za-z]/.test(L)) return -1;
  if (/^[A-Z0-9\s\-]{2,}$/.test(L) && L === L.toUpperCase() && L.length <= 5) {
    return -1;
  }
  const letters = L.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return -1;

  let score = letters.length * 1.8;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(L)) {
    score += 28;
  } else if (/^[A-Z][a-z]+(?:\s+[A-Za-z.'-]+)+$/.test(L)) {
    score += 18;
  }
  if (/['\-]/.test(L) && letters.length >= 5) {
    score += 6;
  }
  if (L.length > 30) {
    score -= 10;
  }
  return score;
}

function pickBestName(lines: string[]): string {
  let best = "";
  let bestScore = 0;
  for (const line of lines) {
    const s = scoreNameCandidate(line);
    if (s > bestScore) {
      bestScore = s;
      best = line.trim();
    }
  }
  return best;
}

function extractNumberGuess(full: string): string {
  const frac = full.match(/\b(\d{1,4})\s*\/\s*(\d{2,4})\b/);
  if (frac?.[1]) {
    return fixOcrDigits(frac[1]);
  }
  const ofPat = full.match(/\b(\d{1,4})\s+of\s+(\d{2,4})\b/i);
  if (ofPat?.[1]) {
    return fixOcrDigits(ofPat[1]);
  }
  const noPat = full.match(/\bNO\.?\s*(\d{1,4})\b/i);
  if (noPat?.[1]) {
    return fixOcrDigits(noPat[1]);
  }
  const hash = full.match(/[#]\s*(\d{1,4})\b/);
  if (hash?.[1]) {
    return fixOcrDigits(hash[1]);
  }
  return "";
}

/** Common OCR confusion on card numbers. */
function fixOcrDigits(s: string): string {
  return s.replace(/[Oo]/g, "0").replace(/[lI|]/g, "1").trim();
}

const SKIP_SET_TOKENS = new Set(
  [
    "FROM",
    "THE",
    "AND",
    "FOR",
    "NOT",
    "ARE",
    "BUT",
    "YOU",
    "ALL",
    "CAN",
    "WAS",
    "ONE",
    "OUR",
    "OUT",
    "DAY",
    "GET",
    "HAS",
    "HIM",
    "HIS",
    "HOW",
    "ITS",
    "LET",
    "NEW",
    "NOW",
    "OLD",
    "SEE",
    "TWO",
    "WAY",
    "WHO",
    "DID",
    "PUT",
    "MAY",
  ].map((s) => s.toUpperCase())
);

function extractSetCodeGuess(full: string, lines: string[]): string {
  const upperFull = full.toUpperCase();
  let best = "";
  let bestRank = 0;

  const consider = (tok: string) => {
    const u = tok.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (u.length < 2 || u.length > 5) return;
    if (NOISE.has(u) || SKIP_SET_TOKENS.has(u)) return;
    let rank = u.length === 3 ? 3 : u.length;
    if (KNOWN_SET_CODE_HINTS.has(u)) {
      rank += 12;
    }
    if (upperFull.includes(` ${u} `) || upperFull.includes(`\n${u}\n`)) {
      rank += 4;
    }
    if (rank > bestRank) {
      bestRank = rank;
      best = u;
    }
  };

  const codeTok = full.match(/\b([A-Za-z]{2,5})\b/g);
  if (codeTok) {
    for (const tok of codeTok) {
      consider(tok);
    }
  }

  for (const line of lines) {
    const m = line.match(/\b([A-Za-z]{2,5})\b/g);
    if (!m) continue;
    for (const tok of m) {
      consider(tok);
    }
  }

  return best;
}

/**
 * Heuristic extraction of name / number / set code from noisy OCR (v1.5).
 * Handles merged front+back blocks separated by `---`.
 */
export function parseCardFromOcrText(raw: string): ScanV1ExtractedText {
  const full = raw.replace(/\u00a0/g, " ").replace(/\f/g, "\n").trim();
  const lines = splitLines(full);

  const numberGuess = extractNumberGuess(full);
  const setCodeGuess = extractSetCodeGuess(full, lines);
  let nameGuess = pickBestName(lines);

  if (!nameGuess && full.includes("---")) {
    const chunks = full.split(/---+/).map((c) => c.trim()).filter(Boolean);
    for (const ch of chunks) {
      const sub = pickBestName(splitLines(ch));
      if (sub && (!nameGuess || scoreNameCandidate(sub) > scoreNameCandidate(nameGuess))) {
        nameGuess = sub;
      }
    }
  }

  return {
    raw_ocr: full,
    name_guess: nameGuess,
    number_guess: numberGuess,
    set_code_guess: setCodeGuess,
    lines,
  };
}
