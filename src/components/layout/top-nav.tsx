"use client";

import { SeasonalNavEventPip } from "@/components/seasonal/seasonal-nav-event-pip";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { NavDropdown, NavDropdownLink } from "@/mca-ui/nav-dropdown";
import { ProfileMenu } from "@/components/layout/profile-menu";
import {
  isActivityActive,
  isCollectionActive,
  isCommunityActive,
  isCreatorActive,
  isFeedActive,
  isScanActive,
  isTradingActive,
} from "@/lib/nav/active-paths";
import {
  NAV_ACCOUNT_LINKS,
  NAV_COLLECTION_LINKS,
  NAV_CREATOR_LINKS,
  NAV_PRIMARY_LINKS,
  NAV_TRADING_LINKS,
} from "@/lib/nav/nav-link-config";
import { McaIcons } from "@/lib/icons/mca-icons";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Icon } from "@/mca-ui/icon";
import { cn } from "@/lib/ui/cn";
import { useLongPress } from "@/lib/ui/use-long-press";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type TopNavUser = { email: string | null; id: string } | null;

function ChevronDown({ className }: { className?: string }) {
  return (
    <Icon
      src={McaIcons.ui.chevronDown}
      size="sm"
      alt=""
      className={cn("h-4 w-4 text-mca-ink-muted", className)}
    />
  );
}

function MenuIcon() {
  return <Icon src={McaIcons.ui.menu} size="sm" alt="" className="text-mca-ink-body" />;
}

function pathMatches(href: string, pathname: string): boolean {
  if (href === "/profile/edit") {
    return pathname === "/profile/edit";
  }
  if (href === "/scan") return isScanActive(pathname);
  if (href === "/activity") return isActivityActive(pathname);
  if (href === "/binders") return pathname.startsWith("/binders");
  if (href === "/decks") return pathname.startsWith("/decks");
  if (href === "/cards") return pathname.startsWith("/cards");
  if (href === "/catalog") return pathname.startsWith("/catalog");
  if (href === "/analytics") return pathname.startsWith("/analytics");
  if (href === "/trades") return pathname.startsWith("/trades");
  if (href === "/matching") return pathname.startsWith("/matching");
  if (href === "/market") return pathname.startsWith("/market");
  if (href === "/community") return isCommunityActive(pathname);
  if (href === "/feed") return isFeedActive(pathname);
  if (href === "/guides") return pathname.startsWith("/guides");
  if (href === "/showcase") return pathname.startsWith("/showcase");
  if (href === "/profile") return pathname === "/profile";
  if (href === "/achievements") return pathname.startsWith("/achievements");
  if (href === "/tier") {
    return pathname.startsWith("/tier") || pathname.startsWith("/pricing");
  }
  if (href === "/support") return pathname.startsWith("/support");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({ user }: { user: TopNavUser }) {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileCtx = useMemo(
    () => ({ componentName: "TopNav", surfaceName: "mobile.shell" } as const),
    []
  );

  const onNavMenuLongPress = useCallback(() => {
    mcaLog.event("mobile.interaction", { kind: "long_press_nav_menu" }, mobileCtx);
  }, [mobileCtx]);

  const navMenuLongPress = useLongPress(onNavMenuLongPress, { durationMs: 550 });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user) {
    return (
      <div className="flex w-full min-w-0 flex-1 items-center justify-between gap-mca-compact">
        <Link
          href="/"
          className="mca-nav-focus-ring shrink-0 rounded-mca-control text-base font-semibold tracking-tight text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none active:scale-[0.98]"
        >
          MyCardArchive
        </Link>
        <div className="flex shrink-0 items-center gap-mca-sm">
          <Link
            href="/auth/sign-in"
            className={cn(
              "mca-header-toolbar-control border border-mca-field-border bg-mca-surface-elevated/80 text-xs font-semibold hover:border-mca-accent-strong/40"
            )}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const collectionActive = isCollectionActive(pathname);
  const tradingActive = isTradingActive(pathname);
  const creatorActive = isCreatorActive(pathname);

  return (
    <>
      <div className="flex w-full min-w-0 flex-1 items-center justify-between gap-mca-sm sm:gap-mca-compact">
        <div className="flex min-h-14 min-w-0 flex-1 items-center gap-mca-sm lg:gap-mca-compact">
          <button
            type="button"
            className="mca-header-toolbar-control border border-mca-border-subtle bg-mca-surface-elevated/60 md:hidden"
            aria-label="Open navigation menu"
            onClick={() => {
              setMobileOpen(true);
              mcaLog.event("mobile.layout.switch", { to: "drawer_open" }, mobileCtx);
            }}
            {...navMenuLongPress}
          >
            <MenuIcon />
          </button>

          <Link
            href="/"
            className="mca-nav-focus-ring shrink-0 rounded-mca-control text-base font-semibold tracking-tight text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none active:scale-[0.98]"
          >
            MyCardArchive
          </Link>

          <SeasonalNavEventPip />

          <nav
            className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 md:flex lg:gap-x-1.5"
            aria-label="Primary"
          >
            <Link
              href="/feed"
              aria-current={isFeedActive(pathname) ? "page" : undefined}
              data-active={isFeedActive(pathname) ? "true" : undefined}
              className="mca-header-toolbar-control inline-flex items-center gap-mca-xs"
            >
              <Icon src={McaIcons.activity.feed} size="sm" alt="" />
              Feed
            </Link>

            <NavDropdown
              active={collectionActive}
              trigger={
                <span className="inline-flex items-center gap-mca-xs">
                  <Icon src={McaIcons.collection.binder} size="sm" alt="" />
                  Collection
                  <ChevronDown />
                </span>
              }
            >
              {NAV_COLLECTION_LINKS.map((item) => (
                <NavDropdownLink
                  key={item.href}
                  href={item.href}
                  active={pathMatches(item.href, pathname)}
                >
                  <span className="inline-flex items-center gap-mca-sm">
                    <Icon src={item.icon} size="sm" alt="" />
                    {item.label}
                  </span>
                </NavDropdownLink>
              ))}
            </NavDropdown>

            <NavDropdown
              active={tradingActive}
              trigger={
                <span className="inline-flex items-center gap-mca-xs">
                  <Icon src={McaIcons.trading.handshake} size="sm" alt="" />
                  Trading
                  <ChevronDown />
                </span>
              }
            >
              {NAV_TRADING_LINKS.map((item) => (
                <NavDropdownLink
                  key={item.href}
                  href={item.href}
                  active={pathMatches(item.href, pathname)}
                >
                  <span className="inline-flex items-center gap-mca-sm">
                    <Icon src={item.icon} size="sm" alt="" />
                    {item.label}
                  </span>
                </NavDropdownLink>
              ))}
            </NavDropdown>

            <Link
              href="/scan"
              aria-current={isScanActive(pathname) ? "page" : undefined}
              data-active={isScanActive(pathname) ? "true" : undefined}
              className="mca-header-toolbar-control inline-flex items-center gap-mca-xs"
            >
              <Icon src={McaIcons.scan.camera} size="sm" alt="" />
              Scan
            </Link>

            <Link
              href="/activity"
              aria-current={isActivityActive(pathname) ? "page" : undefined}
              data-active={isActivityActive(pathname) ? "true" : undefined}
              className="mca-header-toolbar-control inline-flex items-center gap-mca-xs"
            >
              <Icon src={McaIcons.activity.pulse} size="sm" alt="" />
              Activity
            </Link>

            <Link
              href="/community"
              aria-current={isCommunityActive(pathname) ? "page" : undefined}
              data-active={isCommunityActive(pathname) ? "true" : undefined}
              className="mca-header-toolbar-control inline-flex items-center gap-mca-xs"
            >
              <Icon src={McaIcons.ui.community} size="sm" alt="" />
              Community
            </Link>

            <NavDropdown
              active={creatorActive}
              trigger={
                <span className="inline-flex items-center gap-mca-xs">
                  <Icon src={McaIcons.ui.creator} size="sm" alt="" />
                  Creator
                  <ChevronDown />
                </span>
              }
            >
              {NAV_CREATOR_LINKS.map((item) => (
                <NavDropdownLink
                  key={item.href}
                  href={item.href}
                  active={pathMatches(item.href, pathname)}
                >
                  <span className="inline-flex items-center gap-mca-sm">
                    <Icon src={item.icon} size="sm" alt="" />
                    {item.label}
                  </span>
                </NavDropdownLink>
              ))}
            </NavDropdown>
          </nav>
        </div>

        <div className="flex min-h-14 shrink-0 items-center gap-mca-xs sm:gap-mca-sm" aria-label="Account">
          <NotificationsBell userId={user.id} variant="icon" />
          <ProfileMenu user={user} />
        </div>
      </div>

      <MobileNavDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        primaryLinks={[...NAV_PRIMARY_LINKS]}
        creator={{ title: "Creator", items: [...NAV_CREATOR_LINKS] }}
        collection={{ title: "Collection", items: [...NAV_COLLECTION_LINKS] }}
        trading={{ title: "Trading", items: [...NAV_TRADING_LINKS] }}
        account={{ title: "Account", items: [...NAV_ACCOUNT_LINKS] }}
      />
    </>
  );
}
