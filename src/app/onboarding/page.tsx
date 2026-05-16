import { OnboardingFlow } from "@/mca-ui/onboarding/OnboardingFlow";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Set up your MyCardArchive collector profile.",
};

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/onboarding"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "onboarding_complete, handle, display_name, avatar_url, profile_theme, profile_banner_url"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_complete) {
    redirect("/binders");
  }

  return (
    <div className="py-mca-xl">
      <OnboardingFlow
        initialHandle={profile?.handle}
        initialDisplayName={profile?.display_name}
        initialAvatarUrl={profile?.avatar_url}
        initialTheme={profile?.profile_theme}
        initialBannerUrl={profile?.profile_banner_url}
      />
    </div>
  );
}
