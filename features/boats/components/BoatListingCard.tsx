"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, Zap } from "lucide-react";
import { Image as IKImage } from "@imagekit/next";

import type { BoatCard } from "@/features/boats/boat.types";
import { getImageKitProps } from "@/shared/lib/services/imagekit.service";
import { formatStartingHourly } from "@/shared/lib/utils/pricing-utils";
import { cn } from "@/shared/lib/utils/general-utils";

export type BoatListingCardSize = "sm" | "md" | "lg";

const SIZE_STYLES: Record<
  BoatListingCardSize,
  {
    imageMb: string;
    imageRadius: string;
    meta: string;
    title: string;
    price: string;
    heart: string;
    badge: string;
    badgeIcon: string;
    navBtn: string;
    navIcon: string;
    dot: string;
    infoGap: string;
    placeholderLogo: number;
    placeholderText: string;
    imageSizes: string;
  }
> = {
  sm: {
    imageMb: "mb-3",
    imageRadius: "rounded-xl",
    meta: "text-xs",
    title: "text-[15px]",
    price: "text-[15px]",
    heart: "h-4 w-4",
    badge: "px-2.5 py-1 text-[11px]",
    badgeIcon: "h-3 w-3",
    navBtn: "p-1.5",
    navIcon: "h-4 w-4",
    dot: "h-1.5 w-1.5",
    infoGap: "flex flex-col gap-0.5",
    placeholderLogo: 40,
    placeholderText: "text-sm",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  },
  md: {
    imageMb: "mb-3.5",
    imageRadius: "rounded-xl",
    meta: "text-sm",
    title: "text-base",
    price: "text-base",
    heart: "h-[18px] w-[18px]",
    badge: "px-2.5 py-1 text-xs",
    badgeIcon: "h-3.5 w-3.5",
    navBtn: "p-2",
    navIcon: "h-4 w-4",
    dot: "h-1.5 w-1.5",
    infoGap: "flex flex-col gap-0.5",
    placeholderLogo: 48,
    placeholderText: "text-sm",
    imageSizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 30vw",
  },
  lg: {
    imageMb: "mb-4",
    imageRadius: "rounded-2xl",
    meta: "text-sm",
    title: "text-lg",
    price: "text-lg",
    heart: "h-5 w-5",
    badge: "px-3 py-1.5 text-xs",
    badgeIcon: "h-3.5 w-3.5",
    navBtn: "p-2",
    navIcon: "h-5 w-5",
    dot: "h-2 w-2",
    infoGap: "flex flex-col gap-1",
    placeholderLogo: 56,
    placeholderText: "text-base",
    imageSizes: "(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 33vw",
  },
};

export interface BoatListingCardProps {
  boat: BoatCard;
  index?: number;
  size?: BoatListingCardSize;
  showPrice?: boolean;
  className?: string;
}

export default function BoatListingCard({
  boat,
  index = 0,
  size = "sm",
  showPrice = true,
  className,
}: BoatListingCardProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  const styles = SIZE_STYLES[size];

  const images = [boat.mainImage, ...(boat.galleryImages || [])].filter(Boolean);
  const imageUrl = images[imageIndex] ?? null;
  const location =
    boat.locationLabel && boat.locationLabel !== "N/A"
      ? boat.locationLabel
      : null;

  const metaParts: string[] = [];
  if (location) metaParts.push(location);
  if (boat.capacity != null && boat.capacity > 0) {
    metaParts.push(`${boat.capacity} guests`);
  }

  return (
    <Link
      href={`/boats/${boat.id}`}
      className={cn("group block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative aspect-[3/2] overflow-hidden bg-slate-100",
          styles.imageMb,
          styles.imageRadius,
        )}
      >
        {imageUrl ? (
          (() => {
            const props = getImageKitProps(imageUrl, "card", {
              eager: index < 4,
            });
            return (
              <IKImage
                src={props.src}
                alt={boat.displayTitle || boat.name}
                width={props.width}
                height={props.height}
                sizes={styles.imageSizes}
                loading={props.loading}
                fetchPriority={props.fetchPriority}
                transformation={props.transformation}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ position: "absolute", inset: 0 }}
              />
            );
          })()
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Image
              src="/icons/updatekoslogo-branded.png"
              alt=""
              width={styles.placeholderLogo}
              height={styles.placeholderLogo}
              className="mb-2 opacity-30"
            />
            <span className={styles.placeholderText}>Photos coming soon</span>
          </div>
        )}

        {isHovered && images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImageIndex((i) => (i - 1 + images.length) % images.length);
              }}
              className={cn(
                "absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 shadow-md transition hover:bg-white",
                styles.navBtn,
              )}
              aria-label="Previous photo"
            >
              <ChevronLeft className={cn(styles.navIcon, "text-gray-700")} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImageIndex((i) => (i + 1) % images.length);
              }}
              className={cn(
                "absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 shadow-md transition hover:bg-white",
                styles.navBtn,
              )}
              aria-label="Next photo"
            >
              <ChevronRight className={cn(styles.navIcon, "text-gray-700")} />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {images.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-full transition-colors",
                  styles.dot,
                  i === imageIndex ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.infoGap}>
        {/* Row 1: location · guests + wishlist heart */}
        <div className="flex items-center justify-between gap-2">
          {metaParts.length > 0 ? (
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-muted-foreground",
                styles.meta,
              )}
            >
              {metaParts.join(" · ")}
            </p>
          ) : (
            <span className="flex-1" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked((prev) => !prev);
            }}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-red-500"
            aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={liked}
          >
            <Heart
              className={cn(
                styles.heart,
                "transition-colors",
                liked
                  ? "fill-red-500 text-red-500"
                  : "fill-none stroke-[1.75]",
              )}
            />
          </button>
        </div>

        {/* Row 2: title + price */}
        <div className="flex items-baseline justify-between gap-3">
          <h3
            className={cn(
              "min-w-0 flex-1 truncate font-semibold leading-tight text-foreground group-hover:underline",
              styles.title,
            )}
          >
            {boat.displayTitle || boat.name}
          </h3>
          {showPrice && (
            <p
              className={cn(
                "shrink-0 whitespace-nowrap font-semibold text-foreground",
                styles.price,
              )}
            >
              {formatStartingHourly(boat.startingHourlyRate)}
            </p>
          )}
        </div>

        {/* Row 3: instant book */}
        {boat.instantBook && (
          <div className="flex items-center justify-end gap-2">
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 font-semibold text-white",
                styles.badge,
              )}
            >
              <Zap className={cn(styles.badgeIcon, "fill-current")} />
              Instant Book
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
