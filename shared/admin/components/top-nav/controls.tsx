"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKBar } from "kbar";
import { Search } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";

/** A frosted circle: the shape of every control on the right of the top bar. */
export const circleClass =
  "relative flex size-11 shrink-0 items-center justify-center rounded-full border border-glass-border bg-glass-strong text-foreground/85 outline-none transition-[color,filter] hover:text-foreground hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:brightness-125 [&_svg]:size-[18px]";

/** The current page's circle is gold, like the current page pill. */
const circleActiveClass = "border-transparent bg-primary text-primary-foreground hover:text-primary-foreground";

/** An icon link in a circle (Settings). Pass the icon as children. */
export function CircleLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(circleClass, active && circleActiveClass)}
    >
      {children}
    </Link>
  );
}

/** Opens the command bar (⌘K): a search pill on wide screens, a circle below. */
export function SearchButton() {
  const { query } = useKBar();
  return (
    <>
      <button
        type="button"
        onClick={query.toggle}
        className="hidden h-11 w-56 items-center gap-2.5 rounded-full border border-glass-border bg-glass-strong pl-4 pr-2 text-sm text-muted-foreground outline-none transition-[filter] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring min-[1400px]:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded-full bg-glass-inset px-2 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={query.toggle}
        aria-label="Search"
        title="Search (⌘K)"
        className={cn(circleClass, "min-[1400px]:hidden")}
      >
        <Search />
      </button>
    </>
  );
}
