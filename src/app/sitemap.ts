import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";

/** Public marketing and legal routes only — authenticated app surfaces are omitted intentionally. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths: { path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/features/scanning", changeFrequency: "monthly", priority: 0.85 },
    { path: "/features/binders", changeFrequency: "monthly", priority: 0.85 },
    { path: "/features/social", changeFrequency: "monthly", priority: 0.85 },
    { path: "/features/portfolio", changeFrequency: "monthly", priority: 0.85 },
    { path: "/explore/binders", changeFrequency: "daily", priority: 0.7 },
    { path: "/beta", changeFrequency: "monthly", priority: 0.6 },
    { path: "/support", changeFrequency: "monthly", priority: 0.8 },
    { path: "/legal/terms", changeFrequency: "yearly", priority: 0.5 },
    { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.5 },
    { path: "/login", changeFrequency: "yearly", priority: 0.4 },
    { path: "/auth/sign-in", changeFrequency: "yearly", priority: 0.4 },
    { path: "/auth/sign-up", changeFrequency: "yearly", priority: 0.5 },
  ];

  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
