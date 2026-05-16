export type CatalogSearchMode = "name" | "set" | "number";

export type ParsedNumberQuery = {
  raw: string;
  /** Collector number token (may include slash form). */
  number: string;
  setCode?: string;
  fractionTotal?: string;
};

const FRACTION_RE = /^(\d+)\s*\/\s*(\d+)$/;
const SET_CODE_NUM_RE = /^([A-Za-z0-9]{2,6})\s+(\d{1,4})$/i;
const DIGITS_ONLY_RE = /^\d{1,4}$/;
const SET_CODE_ONLY_RE = /^[A-Za-z0-9]{2,6}$/;

/** Expansions commonly searched by printed number alone (e.g. "151"). */
const NUMERIC_SET_QUERIES = new Set(["151", "025"]);

/** Classify manual-add combobox query into search strategy. */
export function classifyCatalogQuery(raw: string): CatalogSearchMode {
  const q = raw.trim();
  if (!q) return "name";

  if (FRACTION_RE.test(q) || SET_CODE_NUM_RE.test(q)) {
    return "number";
  }

  if (NUMERIC_SET_QUERIES.has(q)) {
    return "set";
  }

  if (DIGITS_ONLY_RE.test(q)) {
    return "number";
  }

  if (SET_CODE_ONLY_RE.test(q) && !q.includes(" ")) {
    return "set";
  }

  if (q.includes("/")) {
    return "number";
  }

  const wordCount = q.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 2 && !/^\d/.test(q)) {
    return "set";
  }

  if (wordCount === 1 && /^[A-Za-z]/.test(q) && q.length >= 4 && q.length <= 24) {
    return "set";
  }

  return "name";
}

export function parseNumberQuery(raw: string): ParsedNumberQuery | null {
  const q = raw.trim();
  if (!q) return null;

  const frac = FRACTION_RE.exec(q);
  if (frac) {
    return {
      raw: q,
      number: `${frac[1]}/${frac[2]}`,
      fractionTotal: frac[2],
    };
  }

  const codeNum = SET_CODE_NUM_RE.exec(q);
  if (codeNum) {
    return {
      raw: q,
      setCode: codeNum[1].toUpperCase(),
      number: codeNum[2],
    };
  }

  if (DIGITS_ONLY_RE.test(q)) {
    return { raw: q, number: q };
  }

  if (q.includes("/")) {
    return { raw: q, number: q };
  }

  return null;
}

export function buildSetSearchUrl(query: string): string {
  const sp = new URLSearchParams({ query: query.trim(), limit: "50" });
  return `/api/catalog/search/set?${sp.toString()}`;
}

export function buildNumberSearchUrl(query: string): string {
  const sp = new URLSearchParams({ query: query.trim(), limit: "20" });
  return `/api/catalog/search/number?${sp.toString()}`;
}

/** True when a unique number match should auto-hydrate the form. */
export function isAutoDetectNumberQuery(raw: string): boolean {
  const q = raw.trim();
  return FRACTION_RE.test(q) || SET_CODE_NUM_RE.test(q);
}
