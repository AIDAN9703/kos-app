"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/lib/utils/general-utils";

const LINKS = [
  { label: "Boats", href: "/boats/search" },
  { label: "Experiences", href: "/experiences" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about-us" },
  { label: "Contact", href: "/contact" },
];

/** See-through over the hero; turns solid navy once the page scrolls. */
export function PreviewNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        solid ? "bg-dark-bg/90 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 sm:h-20 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Kings of the Sea Yachts, home"
        >
          <Image
            src="/icons/transparent-white-newer-logo.png"
            alt=""
            width={44}
            height={44}
            className="size-10 sm:size-11"
            priority
          />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.28em] text-white sm:block">
            Kings of the Sea
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-white/75 transition-colors hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="#plan"
            className="inline-flex h-10 items-center rounded-full bg-gold px-5 text-sm font-semibold text-dark-bg transition-colors hover:bg-gold-glow"
          >
            Plan a charter
          </Link>
        </div>
      </div>
    </header>
  );
}
