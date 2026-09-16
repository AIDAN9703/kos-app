"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils/general-utils";
import {
  PROFILE_NAV_ITEMS,
  isProfileNavItemActive,
  roleNavItems,
  type ProfileNavItem,
} from "../profile.nav";

interface ProfileNavProps {
  roles: { isOwner: boolean; isCaptain: boolean };
}

/**
 * Section navigation. Desktop: a stacked list under the identity card.
 * Phones: one scrollable tab strip with the same entries.
 * Items are resolved here (not passed in) because their icons are components,
 * which can't be serialised across the server → client boundary.
 */
export function ProfileNav({ roles }: ProfileNavProps) {
  const pathname = usePathname();
  const items = PROFILE_NAV_ITEMS;
  const roleItems = roleNavItems(roles);
  const all = [...items, ...roleItems];

  return (
    <>
      {/* Desktop — stacked */}
      <nav aria-label="Profile" className="hidden lg:block">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <RailLink item={item} active={isProfileNavItemActive(item, pathname)} />
            </li>
          ))}
        </ul>
        {roleItems.length > 0 ? (
          <>
            <p className="mt-6 mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Your roles
            </p>
            <ul className="space-y-0.5">
              {roleItems.map((item) => (
                <li key={item.href}>
                  <RailLink item={item} active={isProfileNavItemActive(item, pathname)} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </nav>

      {/* Phone / tablet — tab strip */}
      <nav aria-label="Profile" className="-mx-4 border-b border-gray-200 px-4 sm:-mx-8 sm:px-8 lg:hidden">
        <ul className="hide-scrollbar flex gap-6 overflow-x-auto">
          {all.map((item) => {
            const active = isProfileNavItemActive(item, pathname);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px block border-b-2 py-3 text-sm font-semibold transition-colors",
                    active
                      ? "border-gold text-primary"
                      : "border-transparent text-slate-500 hover:text-primary"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function RailLink({ item, active }: { item: ProfileNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
        active
          ? "bg-primary-soft font-semibold text-primary"
          : "text-slate-600 hover:bg-muted/60 hover:text-primary"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
      <span>{item.label}</span>
    </Link>
  );
}
