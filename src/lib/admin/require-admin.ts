import "server-only";

import { isAdminEmail } from "@/lib/invites/invite-config";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Server-only: admin = internal unlimited row or MCA_ADMIN_EMAILS. */
export async function requireAdminUser(): Promise<{
  userId: string;
  email: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?next=/admin/analytics");

  const [internal, admin] = await Promise.all([
    isCurrentUserInternalUnlimited(supabase),
    Promise.resolve(isAdminEmail(user.email)),
  ]);
  if (!internal && !admin) redirect("/feed");

  return { userId: user.id, email: user.email ?? null };
}
