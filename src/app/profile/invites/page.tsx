import { InviteCodeGenerator } from "@/mca-ui/invites/InviteCodeGenerator";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { isAdminEmail } from "@/lib/invites/invite-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Invite codes · MyCardArchive",
  robots: { index: false, follow: false },
};

export default async function ProfileInvitesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?next=/profile/invites");

  const [internal, admin] = await Promise.all([
    isCurrentUserInternalUnlimited(supabase),
    Promise.resolve(isAdminEmail(user.email)),
  ]);
  if (!internal && !admin) redirect("/profile");

  return (
    <div className="mx-auto max-w-lg px-mca-base py-mca-xl">
      <InviteCodeGenerator />
    </div>
  );
}
