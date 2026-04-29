import { AchievementCard } from "@/components/achievement-card";
import { AchievementsUnlockSummary } from "@/components/achievements/achievements-unlock-summary";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { groupAchievementsByCategoryAndRarity } from "@/lib/achievements/categories";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Achievements",
};

type ListAchievement = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
  unlocked: boolean;
  progress: number;
};

function requestOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function cookieHeader(): string {
  return cookies()
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function fetchAchievementsList(): Promise<
  | { ok: true; achievements: ListAchievement[] }
  | { ok: false; status: number; message: string }
> {
  const res = await fetch(`${requestOrigin()}/api/achievements/list`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader(),
    },
  });

  if (res.status === 401) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const body = (await res.json().catch(() => ({}))) as {
    achievements?: ListAchievement[];
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: body.error ?? `Request failed (${res.status})`,
    };
  }

  return { ok: true, achievements: body.achievements ?? [] };
}

function rarityHeading(rarity: string): string {
  if (rarity === "legendary") return "Legendary";
  if (rarity === "rare") return "Rare";
  return "Common";
}

export default async function AchievementsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/achievements");
  }

  const result = await fetchAchievementsList();

  if (!result.ok) {
    if (result.status === 401) {
      redirect("/login?next=/achievements");
    }
    logServerError({
      scope: "ssr",
      route: "/achievements",
      userId: user.id,
      err: new Error(result.message),
    });
    return (
      <div className="space-y-mca-base">
        <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong">
          Achievements
        </h1>
        <div
          role="alert"
          className="rounded-mca-card border border-mca-warning-surface-border/60 bg-mca-warning-surface/25 px-mca-base py-mca-compact text-sm text-mca-nav-accent"
        >
          {result.message}
        </div>
        <p className="text-sm text-mca-ink-subtle">
          If this persists, confirm achievements migrations are applied (e.g.{" "}
          <code className="rounded bg-mca-chrome px-mca-micro py-mca-trace text-xs">
            023_achievements_rarity.sql
          </code>
          ).
        </p>
      </div>
    );
  }

  const { achievements } = result;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const byCategory = groupAchievementsByCategoryAndRarity(achievements);

  return (
    <div className="space-y-mca-section text-mca-ink-strong">
      <SurfaceMountTelemetry name="achievements-page" surfaceName="achievements" />
      <header className="space-y-mca-base">
        <p className="mca-section-reveal text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Progress
        </p>
        <div className="flex flex-col gap-mca-lg sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-mca-sm">
            <h1 className="mca-section-reveal mca-section-reveal-delay-1 text-2xl font-semibold tracking-tight text-mca-ink-strong sm:text-3xl">
              Achievements
            </h1>
            <p className="mca-section-reveal mca-section-reveal-delay-2 max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
              Earn badges as you add binders, cards, and scans. Grouped by
              category and rarity; unlocks toast app-wide on any page.
            </p>
          </div>
          <AchievementsUnlockSummary unlocked={unlockedCount} total={total} />
        </div>
      </header>

      <div className="space-y-mca-2xl">
        {byCategory.map(({ category, groups }) => (
          <section
            key={category}
            aria-labelledby={`cat-${slugify(category)}`}
          >
            <h2
              id={`cat-${slugify(category)}`}
              className="mca-section-reveal mb-mca-lg flex items-center gap-mca-sm border-b border-mca-border pb-mca-compact text-sm font-semibold uppercase tracking-wide text-mca-ink-body dark:border-mca-border-subtle"
            >
              {category}
            </h2>
            <div className="space-y-mca-section">
              {groups.map(({ rarity, items }) => (
                <div key={`${category}-${rarity}`}>
                  <h3 className="mb-mca-compact text-xs font-semibold uppercase tracking-widest text-mca-ink-subtle">
                    {rarityHeading(rarity)}
                  </h3>
                  <div
                    className="grid gap-mca-base sm:grid-cols-2 xl:grid-cols-3"
                    aria-label={`${category} · ${rarityHeading(rarity)}`}
                  >
                    {items.map((a) => (
                      <AchievementCard
                        key={a.id}
                        title={a.title}
                        description={a.description}
                        icon={a.icon}
                        unlocked={a.unlocked}
                        progress={a.progress}
                        requirement_value={a.requirement_value}
                        rarity={a.rarity}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-sm">
        <Link
          href="/binders"
          className="font-medium text-mca-accent underline-offset-2 hover:text-mca-accent-highlight hover:underline"
        >
          Back to binders
        </Link>
      </p>
    </div>
  );
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
