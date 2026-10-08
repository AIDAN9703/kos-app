"use client";

import { usePathname } from "next/navigation";
import { SegmentedNav } from "@/shared/admin/filters";

const TABS = [
  { href: "/admin/marketing", label: "Campaigns" },
  { href: "/admin/marketing/contacts", label: "Contacts" },
];

/** Campaigns | Contacts, in the same pill style as the list views. */
export function MarketingTabs() {
  const pathname = usePathname();
  return <SegmentedNav label="Marketing" links={TABS} activeHref={pathname} />;
}
