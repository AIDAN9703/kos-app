/** The owner portal's tabs. */
export const OWNER_TABS = [
  { href: "/owner", label: "Overview", exact: true },
  { href: "/owner/boats", label: "My boats", exact: false },
  { href: "/owner/charters", label: "Charters", exact: false },
] as const;

export function isOwnerTabActive(tab: (typeof OWNER_TABS)[number], pathname: string): boolean {
  return tab.exact
    ? pathname === tab.href
    : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}
