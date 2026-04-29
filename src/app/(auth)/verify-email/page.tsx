"use client";

import { safeNextPath } from "@/lib/auth/safe-next-path";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const email = searchParams.get("email")?.trim();

  useEffect(() => {
    const q = new URLSearchParams();
    if (email) q.set("email", email);
    if (next) q.set("next", next);
    const query = q.toString();
    router.replace(query ? `/auth/confirm-signup?${query}` : "/auth/confirm-signup");
  }, [email, next, router]);

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      Redirecting...
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle dark:border-mca-border-subtle">
          Loading…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
