/** The owner portal's tabs, in the top bar. */
export const OWNER_TABS = [
  { href: "/owner", label: "Overview", icon: "overview", exact: true },
  { href: "/owner/boats", label: "My boats", icon: "boats", exact: false },
  { href: "/owner/charters", label: "Charters", icon: "charters", exact: false },
  { href: "/owner/earnings", label: "Earnings", icon: "earnings", exact: false },
] as const;

export type OwnerTabIcon = (typeof OWNER_TABS)[number]["icon"];

export function isOwnerTabActive(tab: (typeof OWNER_TABS)[number], pathname: string): boolean {
  return tab.exact
    ? pathname === tab.href
    : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}
