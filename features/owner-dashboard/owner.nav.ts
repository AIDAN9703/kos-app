/** The owner portal's tabs, in the top bar. Earnings and Team are for the Owner role. */
export const OWNER_TABS = [
  { href: "/owner", label: "Overview", icon: "overview", exact: true, ownersOnly: false },
  { href: "/owner/boats", label: "My boats", icon: "boats", exact: false, ownersOnly: false },
  { href: "/owner/charters", label: "Charters", icon: "charters", exact: false, ownersOnly: false },
  { href: "/owner/earnings", label: "Earnings", icon: "earnings", exact: false, ownersOnly: true },
  { href: "/owner/team", label: "Team", icon: "team", exact: false, ownersOnly: true },
] as const;

export type OwnerTabIcon = (typeof OWNER_TABS)[number]["icon"];

export function isOwnerTabActive(tab: (typeof OWNER_TABS)[number], pathname: string): boolean {
  return tab.exact
    ? pathname === tab.href
    : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}
