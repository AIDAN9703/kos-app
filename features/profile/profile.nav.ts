import {
  Anchor,
  CalendarDays,
  Crown,
  Handshake,
  LayoutDashboard,
  Settings,
  Ship,
  type LucideIcon,
} from "lucide-react";

/**
 * The profile section's own navigation — rendered as a stacked list beside the
 * content on desktop and a scrollable tab strip on phones (ProfileNav).
 * Site-wide links to these pages live in shared/lib/constants/navigation-data.ts.
 */
export interface ProfileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only highlight on an exact path match (the overview would otherwise match everything). */
  exact?: boolean;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { href: "/profile", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/profile/bookings", label: "My trips", icon: CalendarDays },
  { href: "/profile/settings", label: "Account settings", icon: Settings },
];

/** For everyone who isn't an owner yet: the way into "List your boat". */
export const LIST_YOUR_BOAT_ITEM: ProfileNavItem = {
  href: "/list-your-boat",
  label: "List your boat",
  icon: Ship,
};

/** The places a person's roles open up, in the same order as the site's user menu. */
export function roleNavItems(roles: {
  isAdmin: boolean;
  isBroker: boolean;
  isOwner: boolean;
  isCaptain: boolean;
}): ProfileNavItem[] {
  const items: ProfileNavItem[] = [];
  if (roles.isAdmin) items.push({ href: "/admin", label: "Admin", icon: Crown });
  if (roles.isOwner) items.push({ href: "/owner", label: "Owner portal", icon: Ship });
  if (roles.isBroker) items.push({ href: "/brokers", label: "Broker portal", icon: Handshake });
  if (roles.isCaptain)
    items.push({ href: "/profile/captain", label: "Captain dashboard", icon: Anchor });
  return items;
}

export function isProfileNavItemActive(item: ProfileNavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
