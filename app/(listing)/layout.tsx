import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/shared/lib/utils/auth-utils";

export const metadata: Metadata = {
  title: "List your boat",
  robots: { index: false, follow: false },
};

/**
 * The listing flow: a focused page with no site navigation, just the logo
 * and a way out. Progress saves on every step, so "Save and exit" is safe.
 */
export default async function ListingFlowLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const exitHref = session?.user.isOwner ? "/owner/boats" : "/list-your-boat";

  return (
    <div className="min-h-svh bg-[#f7f4ee]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/icons/transparent-logo.png"
              alt="KOS Yachts"
              width={40}
              height={40}
              className="filter-blue h-9 w-9 rounded-full sm:h-10 sm:w-10"
              priority
            />
            <span className="text-base font-bold text-primary">List your boat</span>
          </Link>
          <Link
            href={exitHref}
            className="inline-flex h-10 items-center rounded-full bg-foreground/[0.06] px-5 text-sm font-semibold text-primary transition-colors hover:bg-foreground/10"
          >
            {session ? "Save and exit" : "Exit"}
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
