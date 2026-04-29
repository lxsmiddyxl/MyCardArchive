"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { useEffect } from "react";

/**
 * Registers `/sw.js` in production; logs offline bundle readiness once.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        mcaLog.event(
          "pwa.offline.bundle",
          {
            scope: "/",
            bundles: ["feed", "market", "community", "binders", "decks", "trades"],
          },
          { componentName: "PwaRegister", surfaceName: "pwa" }
        );
      })
      .catch(() => {
        /* registration optional */
      });
  }, []);

  return null;
}
