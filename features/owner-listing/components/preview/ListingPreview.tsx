"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ImageIcon, MapPin } from "lucide-react";
import { shownCatalogName } from "@/features/boat-catalog/boat-catalog.keys";
import { defaultListingName, LISTING_BOAT_TYPES } from "../../listing.constants";

/**
 * The card beside the listing flow showing the boat as guests will see it.
 * Each step's form patches it as the owner types, so it fills in live.
 */

export interface PreviewData {
  category: string;
  make: string;
  model: string;
  yearBuilt: string;
  lengthFt: string;
  capacity: string;
  locationLabel: string;
  image: string | null;
  displayTitle: string;
  /** Cheapest priced trip. */
  fromPrice: { hours: number; price: number } | null;
}

type Patch = (patch: Partial<PreviewData>) => void;

const PreviewContext = createContext<{ data: PreviewData; patch: Patch } | null>(null);

export function ListingPreviewProvider({
  initial,
  children,
}: {
  initial: PreviewData;
  children: ReactNode;
}) {
  const [data, setData] = useState(initial);
  const patch = useCallback<Patch>((p) => setData((d) => ({ ...d, ...p })), []);
  return <PreviewContext.Provider value={{ data, patch }}>{children}</PreviewContext.Provider>;
}

const noop: Patch = () => {};

/** For forms: update the preview (a no-op outside the flow). */
export function usePreviewPatch(): Patch {
  return useContext(PreviewContext)?.patch ?? noop;
}

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function ListingPreviewCard() {
  const ctx = useContext(PreviewContext);
  if (!ctx) return null;
  const d = ctx.data;
  const type = LISTING_BOAT_TYPES.find((t) => t.value === d.category)?.label;
  const autoTitle = defaultListingName({
    ...d,
    make: shownCatalogName(d.make),
    model: shownCatalogName(d.model),
  });
  const meta = [
    type,
    d.lengthFt ? `${d.lengthFt} ft` : null,
    d.capacity ? `${d.capacity} guests` : null,
  ].filter(Boolean);

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
        Preview · how guests see it
      </p>
      <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-28px_rgba(15,30,45,0.45)] ring-1 ring-black/5">
        <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,#27445c,#3f6b86)]">
          {d.image ? (
            <Image src={d.image} alt="" fill sizes="300px" className="object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/70">
              <ImageIcon className="h-7 w-7" aria-hidden />
              <span className="text-xs font-medium">Your cover photo</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="line-clamp-2 text-[15px] leading-snug font-semibold text-primary">
            {d.displayTitle || autoTitle || "Your boat"}
          </p>
          {meta.length > 0 ? (
            <p className="mt-1 text-sm text-slate-500">{meta.join(" · ")}</p>
          ) : null}
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{d.locationLabel || "Marina or dock"}</span>
          </p>
          <div className="mt-4 border-t border-gray-100 pt-3 text-sm text-slate-600">
            {d.fromPrice ? (
              <>
                from{" "}
                <span className="text-base font-bold text-primary tabular-nums">
                  {usd(d.fromPrice.price)}
                </span>{" "}
                / {d.fromPrice.hours} hr
              </>
            ) : (
              <span className="text-slate-400">Prices show here</span>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Fills in as you go. Nothing is public until KOS approves it.
      </p>
    </div>
  );
}
