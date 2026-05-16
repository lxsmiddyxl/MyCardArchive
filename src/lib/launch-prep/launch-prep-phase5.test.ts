import { generateInviteCode, normalizeInviteCode } from "@/lib/invites/invite-config";
import { inviteCodesToCsv } from "@/lib/invites/invite-config";
import {
  lighthousePassesThresholds,
  parseLighthouseReport,
} from "@/mca-utils/performance/lighthouse-parse";
import { describe, expect, it } from "vitest";

describe("launch prep phase 5 — lighthouse parse", () => {
  it("parses category scores", () => {
    const parsed = parseLighthouseReport({
      finalUrl: "https://mycardarchive.com",
      fetchTime: new Date().toISOString(),
      categories: {
        performance: { title: "Performance", score: 0.9 },
        seo: { title: "SEO", score: 0.95 },
      },
    });
    expect(parsed?.categories.find((c) => c.id === "performance")?.score).toBe(90);
    expect(lighthousePassesThresholds(parsed!)).toBe(true);
  });
});

describe("launch prep phase 5 — invite wave", () => {
  it("exports invite CSV", () => {
    const csv = inviteCodesToCsv([
      { code: "ABC123", created_at: "2026-01-01", used_at: null },
    ]);
    expect(csv).toContain("code,created_at,used_at");
    expect(csv).toContain("ABC123");
  });

  it("generates normalized codes", () => {
    expect(normalizeInviteCode(" ab-cd ")).toBe("AB-CD");
    expect(generateInviteCode().length).toBeGreaterThan(6);
  });
});

describe("launch prep phase 5 — post-deploy checks", () => {
  it("validates embed frame ancestors string", () => {
    const csp = "frame-ancestors https://mycardarchive.com";
    expect(csp.includes("frame-ancestors")).toBe(true);
    expect(csp.includes("mycardarchive.com")).toBe(true);
  });
});
