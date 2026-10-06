"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "@/shared/lib/auth/auth-client";

import MobileNavigation from "./sub-components/MobileNavigation";
import DesktopNavigation from "./sub-components/DesktopNavigation";
import UserMenu from "./sub-components/UserMenu";
import SearchBar from "./sub-components/SearchBar";
import { navigationData } from "@/shared/lib/constants/navigation-data";

const Navigation = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user;
  const isAdmin = user?.isAdmin === true;
  const isHome = pathname === "/";
  const showNavSearch = !isHome;

  return (
    // On home the navbar scrolls away so the hero search can dock into a
    // logo+search bar (Boatsetter pattern); everywhere else it stays sticky.
    <header
      className={`${isHome ? "relative" : "sticky top-0"} z-50 border-b border-gray-200 bg-white`}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          className="flex min-h-14 items-center justify-between gap-3 py-1.5 sm:min-h-[var(--header-h)] sm:py-2"
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
            <MobileNavigation navigationData={navigationData} user={user} />

            <Link
              href="/"
              className="shrink-0 rounded-full hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Home"
            >
              <Image
                src="/icons/transparent-logo.png"
                alt="Logo"
                width={48}
                height={48}
                className="filter-blue h-10 w-10 rounded-full sm:h-12 sm:w-12"
                priority
              />
            </Link>

            {showNavSearch ? (
              <div className="hidden min-w-0 flex-1 md:block md:max-w-lg lg:max-w-xl">
                <Suspense fallback={<div className="h-10 w-full" />}>
                  <SearchBar variant="compact" />
                </Suspense>
              </div>
            ) : null}
          </div>

          <div className="hidden shrink-0 items-center gap-7 lg:flex">
            <DesktopNavigation navigationData={navigationData} isAdmin={isAdmin} />
            <UserMenu user={user} navigationData={navigationData} />
          </div>

          <div className="flex shrink-0 items-center gap-4 lg:hidden">
            <UserMenu user={user} navigationData={navigationData} />
          </div>
        </nav>

        {showNavSearch ? (
          <div className="pb-3 md:hidden">
            <Suspense fallback={<div className="h-10 w-full" />}>
              <SearchBar variant="compact" />
            </Suspense>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Navigation;
