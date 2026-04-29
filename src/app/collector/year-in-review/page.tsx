import { YearInReviewClient } from "@/components/seasons/year-in-review-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { year?: string; userId?: string };
};

export default async function YearInReviewPage({ searchParams }: PageProps) {
  const sp = searchParams ?? {};
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }
  const yRaw = sp.year != null ? Number(sp.year) : NaN;
  const year = Number.isFinite(yRaw) ? yRaw : new Date().getUTCFullYear() - 1;
  const subject = (sp.userId ?? user.id).trim();

  return (
    <main className="mx-auto max-w-5xl px-mca-md py-mca-xl">
      <YearInReviewClient initialYear={year} subjectUserId={subject} viewerId={user.id} />
    </main>
  );
}
