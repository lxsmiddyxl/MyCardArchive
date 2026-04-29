"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { AchievementToastItem } from "@/components/achievement-toast";
import { normalizeRarity } from "@/lib/achievements/rarity";
import { useCallback, useEffect, useRef, useState } from "react";

type ToastRow = {
  key: string;
  icon: string;
  title: string;
  rarity: string;
};

type ListAchievement = {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
  rarity: string;
};

const POLL_MS = 22_000;

function storageKeys(userId: string) {
  return {
    init: `mca_ach_toast_init_${userId}`,
    seen: `mca_last_seen_achievement_ids_${userId}`,
  };
}

function loadSeen(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSeen(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify(Array.from(ids)));
}

async function fireConfetti(rarity: string) {
  const r = normalizeRarity(rarity);
  if (r === "common") return;
  const confetti = (await import("canvas-confetti")).default;
  const origin = { x: 0.88, y: 0.12 };
  if (r === "legendary") {
    void confetti({
      particleCount: 110,
      spread: 72,
      startVelocity: 38,
      origin,
      scalar: 1.05,
    });
    window.setTimeout(() => {
      void confetti({
        particleCount: 48,
        spread: 55,
        origin,
        scalar: 0.9,
      });
    }, 140);
  } else {
    void confetti({
      particleCount: 52,
      spread: 58,
      startVelocity: 32,
      origin,
      scalar: 0.92,
    });
  }
}

export function AchievementToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastRow[]>([]);
  const userIdRef = useRef<string | null>(null);
  const removeToast = useCallback((key: string) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const poll = async (uid: string) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      const { init, seen: seenKey } = storageKeys(uid);
      let res: Response;
      try {
        res = await fetch("/api/achievements/list", {
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        return;
      }
      if (!res.ok || cancelled) return;

      const body = (await res.json().catch(() => ({}))) as {
        achievements?: ListAchievement[];
      };
      const list = body.achievements ?? [];

      const isInit = !localStorage.getItem(init);
      if (isInit) {
        const unlockedIds = list.filter((a) => a.unlocked).map((a) => a.id);
        saveSeen(seenKey, new Set(unlockedIds));
        localStorage.setItem(init, "1");
        return;
      }

      const seen = loadSeen(seenKey);
      const newcomers = list.filter((a) => a.unlocked && !seen.has(a.id));
      if (newcomers.length === 0) {
        return;
      }

      const nextSeen = new Set(seen);
      for (const a of newcomers) {
        nextSeen.add(a.id);
        const key = `${a.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((prev) => [
          ...prev,
          { key, icon: a.icon, title: a.title, rarity: a.rarity },
        ]);
        void fireConfetti(a.rarity);
      }
      saveSeen(seenKey, nextSeen);
    };

    const arm = (uid: string | undefined) => {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
      if (!uid) {
        userIdRef.current = null;
        return;
      }
      userIdRef.current = uid;
      void poll(uid);
      interval = setInterval(() => void poll(uid), POLL_MS);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) arm(session?.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      arm(session?.user.id);
      if (!session?.user.id) {
        setToasts([]);
      }
    });

    const onVis = () => {
      const uid = userIdRef.current;
      if (uid && document.visibilityState === "visible") void poll(uid);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-20 z-[200] flex max-h-[calc(100vh-6rem)] flex-col gap-mca-sm overflow-y-auto sm:right-6 sm:top-24"
        aria-label="Achievement notifications"
      >
        {toasts.map((t) => (
          <AchievementToastItem
            key={t.key}
            toastKey={t.key}
            icon={t.icon}
            title={t.title}
            rarity={t.rarity}
            onDone={removeToast}
          />
        ))}
      </div>
    </>
  );
}
