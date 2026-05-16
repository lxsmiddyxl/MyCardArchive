export type LighthouseCategoryScore = {
  id: string;
  title: string;
  score: number;
};

export type ParsedLighthouseReport = {
  url: string;
  fetchTime: string;
  categories: LighthouseCategoryScore[];
  performanceMetrics?: {
    fcp?: number;
    lcp?: number;
    tbt?: number;
    cls?: number;
  };
};

/** Parse Lighthouse JSON (categories + audits) for dashboards and tests. */
export function parseLighthouseReport(raw: unknown): ParsedLighthouseReport | null {
  if (!raw || typeof raw !== "object") return null;
  const report = raw as Record<string, unknown>;
  const categoriesRaw = report.categories as Record<string, { title?: string; score?: number }> | undefined;
  if (!categoriesRaw) return null;

  const categories: LighthouseCategoryScore[] = Object.entries(categoriesRaw).map(([id, c]) => ({
    id,
    title: c.title ?? id,
    score: typeof c.score === "number" ? Math.round(c.score * 100) : 0,
  }));

  const audits = report.audits as Record<string, { numericValue?: number }> | undefined;
  const performanceMetrics = audits
    ? {
        fcp: audits["first-contentful-paint"]?.numericValue,
        lcp: audits["largest-contentful-paint"]?.numericValue,
        tbt: audits["total-blocking-time"]?.numericValue,
        cls: audits["cumulative-layout-shift"]?.numericValue,
      }
    : undefined;

  return {
    url: String(report.finalUrl ?? report.requestedUrl ?? ""),
    fetchTime: String(report.fetchTime ?? new Date().toISOString()),
    categories,
    performanceMetrics,
  };
}

export function lighthousePassesThresholds(
  parsed: ParsedLighthouseReport,
  mins: { performance?: number; accessibility?: number; seo?: number; bestPractices?: number } = {}
): boolean {
  const floor = {
    performance: mins.performance ?? 70,
    accessibility: mins.accessibility ?? 85,
    seo: mins.seo ?? 85,
    "best-practices": mins.bestPractices ?? 85,
  };
  return Object.entries(floor).every(([id, min]) => {
    const cat = parsed.categories.find((c) => c.id === id);
    return (cat?.score ?? 0) >= min;
  });
}
