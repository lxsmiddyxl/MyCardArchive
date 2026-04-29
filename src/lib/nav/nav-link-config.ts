import { McaIcons } from "@/lib/icons/mca-icons";

export type NavLinkItem = { href: string; label: string; icon: string };

export const NAV_PRIMARY_LINKS: readonly NavLinkItem[] = [
  { href: "/feed", label: "Feed", icon: McaIcons.activity.feed },
  { href: "/scan", label: "Scan", icon: McaIcons.scan.camera },
  { href: "/activity", label: "Activity", icon: McaIcons.activity.pulse },
  { href: "/community", label: "Community", icon: McaIcons.ui.community },
] as const;

export const NAV_COLLECTION_LINKS: readonly NavLinkItem[] = [
  { href: "/binders", label: "Binders", icon: McaIcons.collection.binder },
  { href: "/decks", label: "Decks", icon: McaIcons.collection.deck },
  { href: "/cards", label: "Inventory", icon: McaIcons.collection.cards },
  { href: "/catalog", label: "Catalog", icon: McaIcons.collection.catalog },
  { href: "/analytics", label: "Analytics", icon: McaIcons.collection.analytics },
] as const;

export const NAV_TRADING_LINKS: readonly NavLinkItem[] = [
  { href: "/trades", label: "Trades", icon: McaIcons.trading.trades },
  { href: "/matching", label: "Matching", icon: McaIcons.trading.matching },
  { href: "/market", label: "Marketplace", icon: McaIcons.trading.marketplace },
] as const;

export const NAV_CREATOR_LINKS: readonly NavLinkItem[] = [
  { href: "/guides", label: "Deck guides", icon: McaIcons.ui.creator },
  { href: "/showcase", label: "Collection showcases", icon: McaIcons.activity.sparkles },
] as const;

export const NAV_ACCOUNT_LINKS: readonly NavLinkItem[] = [
  { href: "/profile", label: "Profile", icon: McaIcons.account.user },
  { href: "/achievements", label: "Achievements", icon: McaIcons.account.achievements },
  { href: "/tier", label: "Plans", icon: McaIcons.account.billing },
  { href: "/support", label: "Report an issue", icon: McaIcons.account.support },
  { href: "/profile/edit", label: "Settings", icon: McaIcons.account.settings },
] as const;
