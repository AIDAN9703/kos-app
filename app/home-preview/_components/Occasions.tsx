"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/lib/utils/general-utils";
import { Container, textLinkClass } from "./ui";

const OCCASIONS = [
  {
    label: "Birthdays",
    line: "The big ones, and every one in between.",
    image: "/images/experiences/birthday.png",
    href: "/experiences/special-events",
  },
  {
    label: "Bachelorettes",
    line: "The best send-off before the big day.",
    image: "/images/experiences/bachelorette.jpg",
    href: "/experiences/special-events",
  },
  {
    label: "Sandbar days",
    line: "Drop anchor, jump in, stay till sunset.",
    image: "/images/experiences/hauloversandbar.jpeg",
    href: "/experiences/sand-bar",
  },
  {
    label: "Sunset cruises",
    line: "Golden hour, seen from the water.",
    image: "/images/experiences/sunset.jpg",
    href: "/experiences",
  },
  {
    label: "Client days",
    line: "Host clients or the team somewhere they'll remember.",
    image: "/images/experiences/corporateevents.webp",
    href: "/experiences/special-events",
  },
  {
    label: "Fishing trips",
    line: "Lines in the water, inshore or offshore.",
    image: "/images/experiences/fish3.jpg",
    href: "/experiences/fishing",
  },
  {
    label: "Watersports",
    line: "Jet skis, wakeboarding and more.",
    image: "/images/experiences/wakeboarding.jpg",
    href: "/experiences/watersports",
  },
  {
    label: "Weddings",
    line: "Ceremonies and celebrations on the water.",
    image: "/images/experiences/wedding-ceremony.webp",
    href: "/experiences/special-events",
  },
  {
    label: "A week away",
    line: "Whole weeks in the Bahamas and beyond.",
    image: "/images/experiences/termcharter.avif",
    href: "/experiences/term-charters",
  },
];

/**
 * Occasions as a list. On phones each row carries its own photo; on desktop
 * the rows are big words and pointing at one swaps the photo beside them.
 */
export function Occasions() {
  const [active, setActive] = useState(0);
  const current = OCCASIONS[active];

  return (
    <section className="bg-white py-20 sm:py-28">
      <Container>
        <h2 className="text-balance text-4xl font-black tracking-tight text-primary sm:text-6xl">
          What are we celebrating?
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-base">
          Every charter gets its own plan: the boat, the route, the stops, the extras. Tell us what
          you&apos;re marking and we&apos;ll shape the day around it.
        </p>

        <div className="mt-10 grid gap-16 lg:mt-12 lg:grid-cols-12">
          <ul className="border-t border-slate-200 lg:col-span-7">
            {OCCASIONS.map((o, i) => (
              <li key={o.label}>
                <Link
                  href={o.href}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                  onFocus={() => setActive(i)}
                  className="group flex items-center gap-4 border-b border-slate-200 py-3 sm:py-4 lg:gap-6 lg:py-4"
                >
                  {/* Phones and tablets: a thumbnail and a line per row. */}
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:size-20 lg:hidden">
                    <Image src={o.image} alt="" fill sizes="80px" className="object-cover" />
                  </span>
                  <span className="hidden w-6 text-xs font-semibold tabular-nums text-slate-400 lg:block">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-xl font-bold tracking-tight text-primary sm:text-2xl lg:text-4xl lg:font-black lg:transition-colors lg:duration-200",
                        active === i
                          ? "lg:text-primary"
                          : "lg:text-slate-300 lg:group-hover:text-primary"
                      )}
                    >
                      {o.label}
                    </span>
                    <span className="mt-0.5 block text-sm leading-6 text-slate-500 lg:hidden">
                      {o.line}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: one photo, as tall as the list, that follows the row you point at. */}
          <div className="relative hidden overflow-hidden rounded-3xl bg-slate-100 lg:col-span-5 lg:block">
            {OCCASIONS.map((o, i) => (
              <Image
                key={o.label}
                src={o.image}
                alt=""
                fill
                sizes="460px"
                className={cn(
                  "object-cover transition-opacity duration-500",
                  active === i ? "opacity-100" : "opacity-0"
                )}
              />
            ))}
            <div
              aria-hidden
              className="absolute inset-0 bg-linear-to-t from-black/70 via-black/0 to-black/0"
            />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <p className="text-2xl font-black leading-tight">{current.label}</p>
              <p className="mt-1 text-[15px] text-white/80">{current.line}</p>
            </div>
          </div>
        </div>

        <Link href="#plan" className={cn(textLinkClass, "mt-8 inline-block")}>
          Tell us about yours
        </Link>
      </Container>
    </section>
  );
}
