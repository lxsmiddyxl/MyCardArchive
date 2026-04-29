import { ensureProfileAndPublic } from "@/lib/supabase/ensureProfile";
import { createClient } from "@/lib/supabase/server";

export default async function AuthRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await ensureProfileAndPublic(supabase, user);
    }
  } catch {
    /* Non-fatal */
  }

  return (
    <div className="flex min-h-[min(32rem,calc(100vh-6rem))] flex-1 flex-col items-center justify-center px-mca-base py-mca-xl">
      {children}
    </div>
  );
}
