import { FEATURE_PAGES } from "@/mca-ui/marketing/marketing-content";
import {
  isOnboardingExemptPath,
  shouldRedirectToOnboarding,
} from "@/mca-utils/onboarding/checkOnboarding";
import { describe, expect, it } from "vitest";
import { mcaMarketingMetadata } from "./marketing-metadata";
import { mcaPublicShareMetadata } from "./public-share-metadata";
import { mcaSegmentMetadata } from "./segment-metadata";

describe("launch prep phase 2 — marketing metadata", () => {
  it("sets canonical, openGraph, and twitter for marketing pages", () => {
    const m = mcaMarketingMetadata({
      title: "MyCardArchive",
      description: "Pokémon TCG binders and scans.",
      path: "/",
      ogImagePath: "/marketing/og/home-hero.svg",
    });
    expect(m.alternates?.canonical).toBe("/");
    expect(m.openGraph?.title).toBe("MyCardArchive");
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("sets public share metadata for binders", () => {
    const m = mcaPublicShareMetadata({
      title: "Trade Binder",
      description: "Public binder",
      path: "/b/abc",
      ogImagePath: "/binder/abc/opengraph-image",
    });
    expect(m.openGraph?.url).toContain("/b/abc");
    const images = m.twitter?.images;
    const first = Array.isArray(images) ? images[0] : images;
    expect(String(first)).toContain("/binder/abc/opengraph-image");
  });

  it("extends segment metadata with twitter", () => {
    const m = mcaSegmentMetadata({
      title: "Binders",
      description: "Your binders",
      path: "/binders",
    });
    expect(m.twitter?.title).toBe("Binders");
  });
});

describe("launch prep phase 2 — feature pages config", () => {
  it("defines four feature slugs", () => {
    expect(FEATURE_PAGES.map((p) => p.slug)).toEqual([
      "scanning",
      "binders",
      "social",
      "portfolio",
    ]);
  });
});

describe("launch prep phase 2 — homepage routing helpers", () => {
  it("does not force onboarding on marketing paths", () => {
    expect(shouldRedirectToOnboarding({ onboarding_complete: false, scan_tutorial_seen: false }, "/")).toBe(
      true
    );
    expect(isOnboardingExemptPath("/features/binders")).toBe(true);
    expect(isOnboardingExemptPath("/embed/b/abc")).toBe(true);
  });
});
