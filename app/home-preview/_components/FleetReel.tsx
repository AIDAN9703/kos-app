"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Image as IKImage } from "@imagekit/next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BoatCard } from "@/features/boats/boat.types";
import { formatCurrency } from "@/shared/lib/utils/general-utils";
import { Container } from "./ui";

/* Portrait crops straight from ImageKit, so tall cards aren't upscaled. */
function portraitTransform(url: string) {
  return url.includes("ik.imagekit.io/") && !url.includes("tr=")
    ? [{ width: 760, height: 950, quality: 80, format: "auto" as const }]
    : [];
}

function meta(boat: BoatCard) {
  const parts: string[] = [];
  if (boat.locationLabel && boat.locationLabel !== "N/A") parts.push(boat.locationLabel);
  if (boat.capacity) parts.push(`Up to ${boat.capacity} guests`);
  return parts.join(" · ");
}

/* Lines the first card up with the page container, then lets the row run off the edge. */
const GUTTER = "px-4 sm:px-8 lg:px-[max(2rem,calc((100vw-1200px)/2+2rem))]";
const SCROLL_GUTTER =
  "scroll-px-4 sm:scroll-px-8 lg:scroll-px-[max(2rem,calc((100vw-1200px)/2+2rem))]";

/** The fleet as a dark, swipeable reel of tall photo cards. */
export function FleetReel({ boats }: { boats: BoatCard[] }) {
  const reel = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const shown = boats.slice(0, 8);
  if (shown.length === 0) return null;

  function onScroll() {
    const el = reel.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }

  function step(dir: 1 | -1) {
    const el = reel.current;
    const card = el?.querySelector<HTMLElement>("[data-card]");
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: "smooth" });
  }

  return (
    <section className="overflow-hidden bg-dark-bg py-20 text-white sm:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-glow">
              The fleet
            </p>
            <h2 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-6xl">
              Pick your boat.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous boats"
              className="flex size-11 items-center justify-center rounded-full ring-1 ring-white/20 transition hover:bg-white/10"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next boats"
              className="flex size-11 items-center justify-center rounded-full ring-1 ring-white/20 transition hover:bg-white/10"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </Container>

      <div
        ref={reel}
        onScroll={onScroll}
        className={`mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 hide-scrollbar ${GUTTER} ${SCROLL_GUTTER}`}
      >
        {shown.map((boat, i) => (
          <Link
            key={boat.id}
            href={`/boats/${boat.id}`}
            data-card
            className="group relative aspect-[4/5] w-[78vw] max-w-[380px] shrink-0 snap-start overflow-hidden rounded-3xl bg-dark-card"
          >
            {boat.mainImage ? (
              <IKImage
                src={boat.mainImage}
                alt={boat.displayTitle || boat.name}
                width={760}
                height={950}
                sizes="380px"
                loading={i < 3 ? "eager" : "lazy"}
                transformation={portraitTransform(boat.mainImage)}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/icons/transparent-white-newer-logo.png"
                  alt=""
                  width={64}
                  height={64}
                  className="opacity-20"
                />
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-black/20"
            />

            {boat.instantBook && (
              <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-dark-bg">
                Instant Book
              </span>
            )}
            <span className="absolute right-5 top-4 text-xs font-semibold tabular-nums text-white/70">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <p className="text-2xl font-black leading-tight">{boat.displayTitle || boat.name}</p>
              <p className="mt-1 text-sm text-white/70">{meta(boat)}</p>
              {boat.startingHourlyRate > 0 && (
                <p className="mt-4 inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold backdrop-blur">
                  From {formatCurrency(boat.startingHourlyRate)}/hr
                </p>
              )}
            </div>
          </Link>
        ))}

        {/* Closing card */}
        <Link
          href="/boats/search"
          className="group relative flex aspect-[4/5] w-[78vw] max-w-[380px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-3xl bg-gold p-6 text-dark-bg sm:p-8"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em]">The whole fleet</p>
          <div>
            <p className="text-4xl font-black leading-[1.05] tracking-tight">
              Every size, every budget.
            </p>
            <span className="mt-6 inline-flex h-11 items-center rounded-full bg-dark-bg px-6 text-sm font-semibold text-white transition-colors group-hover:bg-primary">
              Browse all boats
            </span>
          </div>
        </Link>
      </div>

      <Container>
        <div className="mt-8 h-[2px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-150"
            style={{ width: `${Math.max(12, progress * 100)}%` }}
          />
        </div>
      </Container>
    </section>
  );
}
