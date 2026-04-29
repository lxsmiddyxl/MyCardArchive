"use client";

import { MenuRowButton } from "@/mca-ui/menu-row-button";
import {
  NavDropdown,
  NavDropdownLink,
  useNavDropdownClose,
} from "@/mca-ui/nav-dropdown";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  isProfileMenuActive,
} from "@/lib/nav/active-paths";
import { cn } from "@/lib/ui/cn";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export type ProfileMenuUser = { email: string | null; id: string };

function avatarInitials(email: string | null): string {
  if (!email || !email.trim()) return "?";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase();
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local.slice(0, 1).toUpperCase() || "?";
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0 text-mca-ink-muted", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function linkActive(pathname: string, href: string): boolean {
  if (href === "/profile/edit") {
    return pathname === "/profile/edit";
  }
  if (href === "/profile") {
    return pathname === "/profile";
  }
  if (href === "/achievements") {
    return pathname.startsWith("/achievements");
  }
  if (href === "/tier") {
    return pathname.startsWith("/tier") || pathname.startsWith("/pricing");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProfileMenu({ user }: { user: ProfileMenuUser }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      router.push("/auth/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  const menuActive = isProfileMenuActive(pathname);

  return (
    <NavDropdown
      align="right"
      active={menuActive}
      ariaLabel="Account menu"
      menuClassName="min-w-[13rem]"
      triggerClassName="px-mca-sm sm:px-mca-tight"
      trigger={
        <span className="inline-flex items-center gap-mca-micro">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mca-border-subtle to-mca-chrome text-[10px] font-bold uppercase tracking-tight text-mca-ink-strong ring-1 ring-mca-field-border/80"
            aria-hidden
          >
            {avatarInitials(user.email)}
          </span>
          <ChevronDown className="self-center" />
        </span>
      }
    >
      <div className="border-b border-mca-border px-mca-compact py-mca-sm">
        <p className="truncate text-xs font-medium text-mca-ink-body" title={user.email ?? undefined}>
          {user.email ?? "Signed in"}
        </p>
      </div>
      <div className="py-mca-xs">
        <NavDropdownLink href="/profile" active={linkActive(pathname, "/profile")}>
          Profile
        </NavDropdownLink>
        <NavDropdownLink
          href="/achievements"
          active={linkActive(pathname, "/achievements")}
        >
          Achievements
        </NavDropdownLink>
        <NavDropdownLink href="/tier" active={linkActive(pathname, "/tier")}>
          Plans
        </NavDropdownLink>
        <NavDropdownLink href="/support" active={pathname.startsWith("/support")}>
          Report an issue
        </NavDropdownLink>
        <NavDropdownLink href="/profile/edit" active={linkActive(pathname, "/profile/edit")}>
          Settings
        </NavDropdownLink>
      </div>
      <ProfileSignOutFooter signingOut={signingOut} onSignOut={() => void signOut()} />
    </NavDropdown>
  );
}

function ProfileSignOutFooter({
  signingOut,
  onSignOut,
}: {
  signingOut: boolean;
  onSignOut: () => void;
}) {
  const closeMenu = useNavDropdownClose();
  return (
    <div className="border-t border-mca-border py-mca-xs">
      <MenuRowButton
        variant="danger"
        disabled={signingOut}
        onClick={() => {
          closeMenu?.();
          onSignOut();
        }}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </MenuRowButton>
    </div>
  );
}
