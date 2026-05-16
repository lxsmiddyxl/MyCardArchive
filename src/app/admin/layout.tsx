import { requireAdminUser } from "@/lib/admin/require-admin";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminUser();
  return (
    <div className="mx-auto max-w-6xl px-mca-base py-mca-xl">
      <header className="mb-mca-xl border-b border-mca-border pb-mca-lg">
        <h1 className="text-2xl font-bold text-mca-ink-strong">Admin</h1>
        <p className="mt-mca-micro text-mca-sm text-mca-ink-muted">Launch monitoring (internal)</p>
      </header>
      {children}
    </div>
  );
}
