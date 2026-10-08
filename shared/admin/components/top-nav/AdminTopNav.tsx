"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS, BROKER_NAV_ITEMS } from "@/shared/lib/constants/navigation-data";
import { useToday } from "@/shared/lib/hooks/use-today";
import { AccountMenu, type TopNavUser } from "./AccountMenu";
import { NavPill } from "./NavPill";

const PORTALS = {
  // Settings is the gear among the admin's controls, not a pill.
  admin: { title: "Admin", home: "/admin", pages: ADMIN_NAV_ITEMS.filter((p) => p.href !== "/admin/settings") },
  broker: { title: "Brokers", home: "/brokers", pages: BROKER_NAV_ITEMS },
};

export type TopNavPortal = keyof typeof PORTALS;

function isCurrent(pathname: string, href: string, home: string) {
  if (href === home) return pathname === home;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The top bar: the logo and portal name (with today's date) on the left,
 * every page as a pill in the middle, and `actions` (search, create,
 * notifications, settings) plus the account on the right. Below lg the
 * pills move to their own row, which scrolls sideways.
 */
export function AdminTopNav({
  portal,
  user,
  actions,
}: {
  portal: TopNavPortal;
  user: TopNavUser;
  actions?: ReactNode;
}) {
  const { title, home, pages } = PORTALS[portal];
  const pathname = usePathname();
  const today = useToday("EEEE, MMMM d");
  const nav = useRef<HTMLElement>(null);

  // On narrow screens the pill row scrolls: keep the current page in view.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  // Same side padding and max width as the page area (AdminShell).
  return (
    <header className="shrink-0 px-4 md:px-6 xl:px-12">
      <div className="mx-auto flex w-full max-w-[max(1600px,90vw)] flex-wrap items-center gap-3 py-3 lg:grid lg:h-20 lg:grid-cols-[1fr_auto_1fr] lg:gap-4 lg:py-0">
        <Link
          href={home}
          className="flex min-w-0 items-center gap-3 justify-self-start rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/icons/logo.png"
            alt="Kings of the Sea"
            width={40}
            height={40}
            priority
            className="size-10 shrink-0 object-contain"
          />
          {/* The name and date give way to the pills between lg and xl. */}
          <span className="hidden min-w-0 leading-tight sm:block lg:hidden xl:block">
            <span className="block text-lg font-semibold tracking-tight text-foreground">{title}</span>
            <span className="block h-4 truncate text-xs text-muted-foreground">{today}</span>
          </span>
        </Link>

        <nav
          ref={nav}
          aria-label="Pages"
          className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:-mx-6 md:w-[calc(100%+3rem)] md:px-6 lg:order-none lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0"
        >
          {pages.map((page) => (
            <NavPill
              key={page.href}
              href={page.href}
              label={page.label}
              icon={page.icon}
              active={isCurrent(pathname, page.href, home)}
              featured={page.featured}
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:justify-self-end">
          {actions}
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}
