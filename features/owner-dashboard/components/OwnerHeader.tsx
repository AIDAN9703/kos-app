"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Ship,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";
import { OwnerSwitcher } from "@/features/owner-accounts/components/OwnerSwitcher";
import { OWNER_TABS, isOwnerTabActive, type OwnerTabIcon } from "../owner.nav";
import type { OwnerView } from "../owner.types";

const ICONS: Record<OwnerTabIcon, LucideIcon> = {
  overview: LayoutDashboard,
  boats: Ship,
  charters: CalendarDays,
  earnings: Wallet,
  team: Users,
};

/**
 * The portal's top bar, in the admin's glass language: logo and the owner's
 * name on the left (a switcher for people in several owners), the tabs as
 * labelled pills (the current one gold), and Exit back to the customer
 * account. Below lg the tabs get their own row and scroll.
 */
export function OwnerHeader({ view }: { view: OwnerView }) {
  const tabs = OWNER_TABS.filter((tab) => !tab.ownersOnly || view.role === "OWNER");
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    nav.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  // Same gutter as the page area (OwnerShell) so the logo lines up with the content.
  return (
    <header className="shrink-0 px-4 md:px-6 xl:px-12">
      <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center gap-3 py-3 lg:grid lg:h-20 lg:grid-cols-[1fr_auto_1fr] lg:gap-4 lg:py-0">
        <div className="flex min-w-0 items-center gap-3 justify-self-start">
          <Link
            href="/owner"
            className="shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/icons/logo.png"
              alt="Kings of the Sea"
              width={40}
              height={40}
              priority
              className="size-10 shrink-0 object-contain"
            />
          </Link>
          <span className="min-w-0 leading-tight">
            <Link
              href="/owner"
              className="block text-lg font-semibold tracking-tight text-foreground outline-none focus-visible:underline"
            >
              Owner portal
            </Link>
            {view.memberships.length > 1 ? (
              <OwnerSwitcher current={view.accountId} memberships={view.memberships} />
            ) : (
              <span className="block h-4 truncate text-xs text-muted-foreground">
                {view.accountName}
              </span>
            )}
          </span>
        </div>

        <nav
          ref={nav}
          aria-label="Owner portal"
          className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:-mx-6 md:w-[calc(100%+3rem)] md:px-6 lg:order-none lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0"
        >
          {tabs.map((tab) => {
            const Icon = ICONS[tab.icon];
            const active = isOwnerTabActive(tab, pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium outline-none transition-[filter,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-transparent bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)]"
                    : "border-glass-border bg-glass-strong text-foreground/85 hover:text-foreground hover:brightness-125"
                )}
              >
                <Icon aria-hidden className="size-[18px] shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/profile"
          className="ml-auto flex h-11 shrink-0 items-center gap-2 rounded-full border border-glass-border bg-glass-strong px-5 text-sm font-semibold text-foreground outline-none transition-[filter] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring lg:ml-0 lg:justify-self-end"
        >
          <LogOut aria-hidden className="size-4" />
          Exit
        </Link>
      </div>
    </header>
  );
}
