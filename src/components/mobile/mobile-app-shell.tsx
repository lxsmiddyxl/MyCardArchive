"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { initMobileActionQueueListeners } from "@/lib/mobile/action-queue";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/market", label: "Market" },
  { href: "/community", label: "Community" },
  { href: "/trades", label: "Trades" },
  { href: "/mobile/notifications", label: "Alerts" },
  { href: "/mobile/sync", label: "Sync" },
] as const;

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    return initMobileActionQueueListeners();
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.ready.then((reg) => {
      const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (t: string) => Promise<void> } }).sync;
      if (sync?.register) {
        void sync.register("mca-feed-market").catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;
    mcaLog.event("mobile.app_shell", { path: pathname }, { componentName: "MobileAppShell", surfaceName: "mobile" });
  }, [pathname]);

  return (
    <>
      {children}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-[120] border-t border-mca-border bg-mca-surface/95 backdrop-blur-md md:hidden"
        )}
        aria-label="App shell"
      >
        <ul className="mx-auto flex max-w-6xl justify-around gap-mca-xs px-mca-sm py-mca-sm pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  prefetch={true}
                  className={cn(
                    "block min-h-[44px] min-w-[44px] rounded-mca-control px-mca-sm py-mca-xs text-center text-mca-caption font-semibold",
                    active ? "text-mca-accent-strong" : "text-mca-ink-muted"
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
