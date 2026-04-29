/** Path-prefix helpers for nav active states (App Router). */

export function isFeedActive(pathname: string): boolean {
  return pathname === "/feed" || pathname.startsWith("/feed/");
}

export function isCollectionActive(pathname: string): boolean {
  return (
    pathname.startsWith("/binders") ||
    pathname.startsWith("/decks") ||
    pathname.startsWith("/cards") ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/analytics")
  );
}

export function isTradingActive(pathname: string): boolean {
  return (
    pathname.startsWith("/trades") ||
    pathname.startsWith("/matching") ||
    pathname.startsWith("/market")
  );
}

export function isScanActive(pathname: string): boolean {
  return pathname === "/scan" || pathname.startsWith("/scan/");
}

export function isActivityActive(pathname: string): boolean {
  return pathname === "/activity" || pathname.startsWith("/activity/");
}

export function isCommunityActive(pathname: string): boolean {
  return pathname === "/community" || pathname.startsWith("/community/");
}

export function isCreatorActive(pathname: string): boolean {
  return pathname.startsWith("/guides") || pathname.startsWith("/showcase");
}

export function isProfileMenuActive(pathname: string): boolean {
  return (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/achievements") ||
    pathname.startsWith("/tier") ||
    pathname.startsWith("/pricing")
  );
}
