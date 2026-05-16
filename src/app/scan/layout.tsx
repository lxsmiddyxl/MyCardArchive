import { OfflineNotice } from "@/components/system/offline-notice";
import { ScanTutorialOverlay } from "@/mca-ui/onboarding/ScanTutorialOverlay";
import { createClient } from "@/lib/supabase/server";

export default async function ScanLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let scanTutorialSeen = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("scan_tutorial_seen")
      .eq("id", user.id)
      .maybeSingle();
    scanTutorialSeen = Boolean(data?.scan_tutorial_seen);
  }

  return (
    <>
      <OfflineNotice />
      {children}
      {user ? <ScanTutorialOverlay initialSeen={scanTutorialSeen} /> : null}
    </>
  );
}
