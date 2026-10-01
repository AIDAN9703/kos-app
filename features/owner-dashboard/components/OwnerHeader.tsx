"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";
import { OWNER_TABS, isOwnerTabActive } from "../owner.nav";

/** Portal top bar: who's here, the three sections, and a big way out. */
export function OwnerHeader({ ownerName }: { ownerName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link href="/owner" className="flex min-w-0 items-center gap-3">
            <Image
              src="/icons/transparent-logo.png"
              alt="KOS Yachts"
              width={44}
              height={44}
              className="filter-blue h-10 w-10 shrink-0 rounded-full sm:h-11 sm:w-11"
              priority
            />
            <span className="min-w-0">
              <span className="block text-base font-bold whitespace-nowrap text-primary sm:text-lg">
                Owner portal
              </span>
              <span className="block truncate text-xs text-slate-500">{ownerName}</span>
            </span>
          </Link>

          <Link
            href="/profile"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Exit <span className="hidden sm:inline">owner</span> portal
          </Link>
        </div>

        <nav aria-label="Owner portal" className="-mb-px">
          <ul className="hide-scrollbar flex gap-6 overflow-x-auto">
            {OWNER_TABS.map((tab) => {
              const active = isOwnerTabActive(tab, pathname);
              return (
                <li key={tab.href} className="shrink-0">
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block border-b-2 pt-1 pb-3 text-sm font-semibold transition-colors",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-primary"
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
