"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LegacyResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/auth/reset-password?${query}` : "/auth/reset-password");
  }, [router, searchParams]);

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      Redirecting to secure reset flow...
    </div>
  );
}
