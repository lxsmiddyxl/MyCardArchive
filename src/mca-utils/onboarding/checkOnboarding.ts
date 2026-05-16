import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type OnboardingProfileFlags = {
  onboarding_complete: boolean;
  scan_tutorial_seen: boolean;
};

const EXEMPT_PREFIXES = [
  "/onboarding",
  "/auth",
  "/api",
  "/binders/new",
  "/binders/create",
  "/scan",
  "/profile/edit",
] as const;

/** Paths that should not trigger a forced redirect to /onboarding. */
export function isOnboardingExemptPath(pathname: string): boolean {
  if (EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (/^\/binders\/[^/]+\/add-card/.test(pathname)) return true;
  if (/^\/binders\/[^/]+(\/|$)/.test(pathname) && !pathname.includes("/settings")) {
    return true;
  }
  return false;
}

export function shouldRedirectToOnboarding(
  flags: OnboardingProfileFlags | null | undefined,
  pathname: string
): boolean {
  if (!flags || flags.onboarding_complete) return false;
  return !isOnboardingExemptPath(pathname);
}

export function needsOnboardingExperience(
  flags: OnboardingProfileFlags | null | undefined,
  binderCount: number
): boolean {
  if (!flags) return binderCount === 0;
  return !flags.onboarding_complete || binderCount === 0;
}

export async function loadOnboardingFlags(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OnboardingProfileFlags | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_complete, scan_tutorial_seen")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    onboarding_complete: Boolean(data.onboarding_complete),
    scan_tutorial_seen: Boolean(data.scan_tutorial_seen),
  };
}

export async function loadBinderCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("binders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return 0;
  return count ?? 0;
}
