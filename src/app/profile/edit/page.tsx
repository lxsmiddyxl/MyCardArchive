import { ProfileEditClient } from "@/components/profile/profile-edit-client";
import { parseProfileTheme } from "@/lib/binders/portfolio-types";
import { ProfileBannerEditor } from "@/mca-ui/profile/ProfileBannerEditor";
import { ProfileThemeSelector } from "@/mca-ui/profile/ProfileThemeSelector";
import { ShowcaseEditor } from "@/mca-ui/profile/ShowcaseEditor";
import { AuthenticatedPresenceShell } from "@/components/realtime/app-wide-presence";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { loadSelfSocialProfile } from "@/lib/social/build-profile";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit profile",
};

export default async function ProfileEditPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/profile/edit"));
  }

  const loaded = await loadSelfSocialProfile(supabase, user);
  if ("error" in loaded) {
    redirect("/profile");
  }

  const { data: portfolio } = await supabase
    .from("profiles")
    .select("profile_theme, profile_banner_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AuthenticatedPresenceShell userId={user.id}>
      <div className="space-y-mca-xl pb-mca-xl">
        <SurfaceMountTelemetry name="profile-edit-page" surfaceName="profile.edit" />
        <header className="border-b border-mca-border pb-mca-lg">
          <Link
            href="/profile"
            className="text-sm font-medium text-mca-accent-strong/90 hover:text-mca-accent"
          >
            ← Back to profile
          </Link>
          <p className="mca-typo-label mt-mca-md">Account</p>
          <h1 className="mt-mca-sm text-3xl font-semibold tracking-tight text-mca-ink">Edit profile</h1>
        </header>
        <ProfileEditClient initial={loaded} />
        <ProfileThemeSelector initialTheme={parseProfileTheme(portfolio?.profile_theme)} />
        <ProfileBannerEditor initialUrl={portfolio?.profile_banner_url ?? null} />
        <ShowcaseEditor />
        <Link
          href="/binders/collections"
          className="inline-flex text-sm font-medium text-mca-accent-strong/90 hover:underline"
        >
          Binder collections & groups →
        </Link>
      </div>
    </AuthenticatedPresenceShell>
  );
}
