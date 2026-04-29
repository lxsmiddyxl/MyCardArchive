"use client";

import {
  PRESENCE_ONLINE_USERS,
  getPresenceMemberCountSync,
  isUserOnlineAppWide,
  joinPresence,
  leavePresence,
  subscribeToPresence,
} from "@/lib/realtime/channels";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AppWidePresenceValue = {
  unavailable: boolean;
  onlineCount: number | null;
  /** Reads from unified registry; false if the online-users topic is inactive. */
  isUserOnline: (userId: string) => boolean;
  /** Increments when presence sync/join/leave fires (re-read registry). */
  version: number;
};

const AppWidePresenceCtx = createContext<AppWidePresenceValue | null>(null);

type PresenceBundleState = {
  unavailable: boolean;
  onlineCount: number | null;
  version: number;
};

export function AppWidePresenceProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<PresenceBundleState>({
    unavailable: false,
    onlineCount: null,
    version: 0,
  });
  const cancelledRef = useRef(false);

  const onPresenceMuxEvent = useCallback(() => {
    if (cancelledRef.current) return;
    const n = getPresenceMemberCountSync(PRESENCE_ONLINE_USERS);
    setState((s) => ({
      ...s,
      version: s.version + 1,
      onlineCount: n,
    }));
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    let unsubPresence: (() => void) | undefined;

    void (async () => {
      try {
        await joinPresence(PRESENCE_ONLINE_USERS, { user_id: userId });
        if (cancelledRef.current) return;
        unsubPresence = subscribeToPresence(PRESENCE_ONLINE_USERS, {
          onSync: onPresenceMuxEvent,
          onJoin: onPresenceMuxEvent,
          onLeave: onPresenceMuxEvent,
        });
        const n = getPresenceMemberCountSync(PRESENCE_ONLINE_USERS);
        if (!cancelledRef.current) {
          setState((s) => ({ ...s, onlineCount: n }));
        }
      } catch {
        if (!cancelledRef.current) {
          setState((s) => ({ ...s, unavailable: true }));
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
      unsubPresence?.();
      void leavePresence(PRESENCE_ONLINE_USERS);
    };
  }, [userId, onPresenceMuxEvent]);

  const isUserOnline = useCallback(
    (uid: string) => {
      void state.version;
      return isUserOnlineAppWide(uid);
    },
    [state.version]
  );

  const value = useMemo<AppWidePresenceValue>(
    () => ({
      unavailable: state.unavailable,
      onlineCount: state.onlineCount,
      isUserOnline,
      version: state.version,
    }),
    [state.unavailable, state.onlineCount, isUserOnline, state.version]
  );

  return <AppWidePresenceCtx.Provider value={value}>{children}</AppWidePresenceCtx.Provider>;
}

export function useAppWidePresence(): AppWidePresenceValue {
  const ctx = useContext(AppWidePresenceCtx);
  if (!ctx) {
    throw new Error("useAppWidePresence must be used within AppWidePresenceProvider");
  }
  return ctx;
}

export function useAppWidePresenceOptional(): AppWidePresenceValue | null {
  return useContext(AppWidePresenceCtx);
}

/** Single `online-users` join for any authenticated page subtree. */
export function AuthenticatedPresenceShell({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  return <AppWidePresenceProvider userId={userId}>{children}</AppWidePresenceProvider>;
}
