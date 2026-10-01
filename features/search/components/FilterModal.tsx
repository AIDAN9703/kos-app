"use client";

import { useCallback, useEffect, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import {
  Anchor,
  Bluetooth,
  ChefHat,
  Fish,
  Flame,
  Loader2,
  Minus,
  Plus,
  Sailboat,
  ShowerHead,
  Snowflake,
  Sparkles,
  Usb,
  Waves,
  Wifi,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/shared/components/ui/drawer";

import { getSearchCategories } from "@/features/search/actions/search-actions";
import { useSearchURL } from "@/features/search/hooks/useSearchURL";
import { useIsMobile } from "@/shared/lib/hooks/use-mobile";
import {
  parseArrayParam,
  parseNumberParam,
} from "@/shared/lib/utils/search-params-utils";
import { cn } from "@/shared/lib/utils/general-utils";

// ============================================================================
// Constants
// ============================================================================

const FEATURES = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "airConditioning", label: "Air conditioning", icon: Snowflake },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "shower", label: "Shower", icon: ShowerHead },
  { id: "bluetooth", label: "Bluetooth", icon: Bluetooth },
  { id: "usb", label: "USB charging", icon: Usb },
  { id: "waterToys", label: "Water toys", icon: Sparkles },
  { id: "fishingGear", label: "Fishing gear", icon: Fish },
  { id: "snorkelingGear", label: "Snorkeling gear", icon: Waves },
  { id: "paddleBoard", label: "Paddle board", icon: Anchor },
  { id: "jetSki", label: "Jet ski", icon: Sailboat },
  { id: "bbq", label: "BBQ grill", icon: Flame },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const PRICE_MAX = 20000;
const LENGTH_MAX = 100;
const YEAR_MIN = 1980;

const DEFAULTS = {
  price: [0, PRICE_MAX] as [number, number],
  length: [0, LENGTH_MAX] as [number, number],
  year: [YEAR_MIN, CURRENT_YEAR] as [number, number],
  guests: 1,
  cabins: 0,
  bathrooms: 0,
};

const formatMoney = (n: number) =>
  n >= PRICE_MAX ? `$${PRICE_MAX.toLocaleString()}+` : `$${n.toLocaleString()}`;

// ============================================================================
// Local primitives — kept colocated so the modal stays a single self-contained
// surface and any visual tweaks live next to where they're used.
// ============================================================================

/** Dual-thumb range slider with brand-tinted, larger touch targets. */
function RangeSlider({
  value,
  onValueChange,
  min,
  max,
  step,
  className,
}: {
  value: [number, number];
  onValueChange: (v: [number, number]) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      value={value}
      onValueChange={(v) => onValueChange([v[0], v[1]])}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={1}
      className={cn(
        "relative flex h-6 w-full touch-none select-none items-center",
        className
      )}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-200">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {value.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={i === 0 ? "Minimum" : "Maximum"}
          className="block h-5 w-5 rounded-full border-2 border-primary bg-white shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

/** [- N +] stepper. Replaces the awkward Select dropdowns for capacity. */
function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  unit,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const display =
    value === min && unit ? "Any" : `${value}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[6rem] text-center text-sm font-medium tabular-nums">
          {display}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Selectable pill chip — categories, features, and quick presets. */
function Chip({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-foreground"
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

/** Small numeric pill that surfaces an active count next to a section title. */
function CountPill({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold tabular-nums text-primary">
      {n}
    </span>
  );
}

/** Always-expanded section. Title + optional hint + content. */
function Section({
  title,
  hint,
  active = 0,
  children,
}: {
  title: string;
  hint?: string;
  active?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-100 py-6 first:border-t-0 first:pt-2">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <CountPill n={active} />
        </div>
        {hint ? (
          <p className="text-xs tabular-nums text-muted-foreground">{hint}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** Typed numeric input with optional prefix/suffix. Clamps to [min, max]. */
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  prefix,
  suffix,
  showPlusAtMax,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  prefix?: string;
  suffix?: string;
  showPlusAtMax?: boolean;
}) {
  const [text, setText] = useState(() => String(value));

  // Re-sync local text whenever the canonical value changes externally
  // (slider movement, preset chip click, reset, hydrate-on-open).
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const display = showPlusAtMax && value >= max ? `${value}+` : text;

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        {prefix ? (
          <span className="mr-1 text-sm text-gray-500">{prefix}</span>
        ) : null}
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, "");
            setText(raw);
            const n = raw === "" ? min : parseInt(raw, 10);
            if (!Number.isNaN(n)) {
              onChange(Math.min(max, Math.max(min, n)));
            }
          }}
          onBlur={() => setText(String(value))}
          className="w-full bg-transparent text-sm font-medium tabular-nums text-foreground outline-none placeholder:text-gray-400"
        />
        {suffix ? (
          <span className="ml-1 text-sm text-gray-500">{suffix}</span>
        ) : null}
      </div>
    </label>
  );
}

// ============================================================================
// FilterModal — orchestrates state, hydrates from URL, applies via URL update,
// and renders inside a Drawer (mobile) or Dialog (desktop).
// ============================================================================

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterModal({ isOpen, onClose }: FilterModalProps) {
  const isMobile = useIsMobile();
  const { searchParams, isPending, updateSearchParams } = useSearchURL();

  // ---- Filter state ----
  const [price, setPrice] = useState<[number, number]>(DEFAULTS.price);
  const [length, setLength] = useState<[number, number]>(DEFAULTS.length);
  const [year, setYear] = useState<[number, number]>(DEFAULTS.year);
  const [guests, setGuests] = useState(DEFAULTS.guests);
  const [cabins, setCabins] = useState(DEFAULTS.cabins);
  const [bathrooms, setBathrooms] = useState(DEFAULTS.bathrooms);
  const [categories, setCategories] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  // ---- Category options (fetched once) ----
  const [categoryOptions, setCategoryOptions] = useState<
    { category: string; count: number; displayName: string }[]
  >([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Hydrate state from URL each time the modal opens, so the form always
  // reflects what's currently applied (no stale state across open/close).
  useEffect(() => {
    if (!isOpen) return;
    const num = (k: string, fb: number) =>
      parseNumberParam(searchParams.get(k)) ?? fb;
    const arr = (k: string) => parseArrayParam(searchParams.get(k));

    setPrice([
      num("minPrice", DEFAULTS.price[0]),
      num("maxPrice", DEFAULTS.price[1]),
    ]);
    setLength([
      num("minLength", DEFAULTS.length[0]),
      num("maxLength", DEFAULTS.length[1]),
    ]);
    setYear([
      num("minYear", DEFAULTS.year[0]),
      num("maxYear", DEFAULTS.year[1]),
    ]);
    setGuests(num("passengers", DEFAULTS.guests));
    setCabins(num("cabins", DEFAULTS.cabins));
    setBathrooms(num("bathrooms", DEFAULTS.bathrooms));
    setCategories(arr("category"));
    setFeatures(arr("features"));
  }, [isOpen, searchParams]);

  useEffect(() => {
    let mounted = true;
    getSearchCategories()
      .then((cats) => {
        if (mounted) {
          setCategoryOptions(cats);
          setLoadingCats(false);
        }
      })
      .catch((e) => {
        console.error("Failed to load categories", e);
        if (mounted) setLoadingCats(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ---- Active flags / counts ----
  const isPriceActive =
    price[0] > DEFAULTS.price[0] || price[1] < DEFAULTS.price[1];
  const isLengthActive =
    length[0] > DEFAULTS.length[0] || length[1] < DEFAULTS.length[1];
  const isYearActive =
    year[0] > DEFAULTS.year[0] || year[1] < DEFAULTS.year[1];
  const capacityActive =
    (guests > DEFAULTS.guests ? 1 : 0) +
    (cabins > DEFAULTS.cabins ? 1 : 0) +
    (bathrooms > DEFAULTS.bathrooms ? 1 : 0);

  const totalActive =
    (isPriceActive ? 1 : 0) +
    (isLengthActive ? 1 : 0) +
    (isYearActive ? 1 : 0) +
    capacityActive +
    (categories.length > 0 ? 1 : 0) +
    (features.length > 0 ? 1 : 0);

  // ---- Handlers ----
  const apply = useCallback(() => {
    updateSearchParams({
      minPrice: price[0] > DEFAULTS.price[0] ? price[0] : null,
      maxPrice: price[1] < DEFAULTS.price[1] ? price[1] : null,
      minLength: length[0] > DEFAULTS.length[0] ? length[0] : null,
      maxLength: length[1] < DEFAULTS.length[1] ? length[1] : null,
      minYear: year[0] > DEFAULTS.year[0] ? year[0] : null,
      maxYear: year[1] < DEFAULTS.year[1] ? year[1] : null,
      passengers: guests > DEFAULTS.guests ? guests : null,
      cabins: cabins > DEFAULTS.cabins ? cabins : null,
      bathrooms: bathrooms > DEFAULTS.bathrooms ? bathrooms : null,
      category: categories.length > 0 ? categories.join(",") : null,
      features: features.length > 0 ? features.join(",") : null,
      page: 1,
    });
    onClose();
  }, [
    updateSearchParams,
    price,
    length,
    year,
    guests,
    cabins,
    bathrooms,
    categories,
    features,
    onClose,
  ]);

  const resetAll = useCallback(() => {
    setPrice(DEFAULTS.price);
    setLength(DEFAULTS.length);
    setYear(DEFAULTS.year);
    setGuests(DEFAULTS.guests);
    setCabins(DEFAULTS.cabins);
    setBathrooms(DEFAULTS.bathrooms);
    setCategories([]);
    setFeatures([]);
  }, []);

  const toggleCategory = (id: string) =>
    setCategories((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
    );
  const toggleFeature = (id: string) =>
    setFeatures((f) =>
      f.includes(id) ? f.filter((x) => x !== id) : [...f, id]
    );

  // ---- Shared body ----
  const body = (
    <div className="px-5 sm:px-6">
      {/* Price */}
      <Section
        title="Price per day"
        hint={`${formatMoney(price[0])} – ${formatMoney(price[1])}`}
        active={isPriceActive ? 1 : 0}
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Min"
            value={price[0]}
            onChange={(n) => setPrice([Math.min(n, price[1]), price[1]])}
            min={DEFAULTS.price[0]}
            max={DEFAULTS.price[1]}
            prefix="$"
          />
          <NumberField
            label="Max"
            value={price[1]}
            onChange={(n) => setPrice([price[0], Math.max(n, price[0])])}
            min={DEFAULTS.price[0]}
            max={DEFAULTS.price[1]}
            prefix="$"
            showPlusAtMax
          />
        </div>
        <div className="mt-5 px-1">
          <RangeSlider
            value={price}
            onValueChange={setPrice}
            min={DEFAULTS.price[0]}
            max={DEFAULTS.price[1]}
            step={250}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip
            active={price[0] === 0 && price[1] === 1000}
            onClick={() => setPrice([0, 1000])}
          >
            Under $1,000
          </Chip>
          <Chip
            active={price[0] === 1000 && price[1] === 5000}
            onClick={() => setPrice([1000, 5000])}
          >
            $1k – $5k
          </Chip>
          <Chip
            active={price[0] === 5000 && price[1] === PRICE_MAX}
            onClick={() => setPrice([5000, PRICE_MAX])}
          >
            $5k+
          </Chip>
        </div>
      </Section>

      {/* Length */}
      <Section
        title="Boat length"
        hint={`${length[0]} – ${length[1] >= LENGTH_MAX ? "100+" : length[1]} ft`}
        active={isLengthActive ? 1 : 0}
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Min"
            value={length[0]}
            onChange={(n) => setLength([Math.min(n, length[1]), length[1]])}
            min={DEFAULTS.length[0]}
            max={DEFAULTS.length[1]}
            suffix="ft"
          />
          <NumberField
            label="Max"
            value={length[1]}
            onChange={(n) => setLength([length[0], Math.max(n, length[0])])}
            min={DEFAULTS.length[0]}
            max={DEFAULTS.length[1]}
            suffix="ft"
            showPlusAtMax
          />
        </div>
        <div className="mt-5 px-1">
          <RangeSlider
            value={length}
            onValueChange={setLength}
            min={DEFAULTS.length[0]}
            max={DEFAULTS.length[1]}
            step={1}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip
            active={length[0] === 0 && length[1] === 30}
            onClick={() => setLength([0, 30])}
          >
            Up to 30 ft
          </Chip>
          <Chip
            active={length[0] === 30 && length[1] === 60}
            onClick={() => setLength([30, 60])}
          >
            30 – 60 ft
          </Chip>
          <Chip
            active={length[0] === 60 && length[1] === LENGTH_MAX}
            onClick={() => setLength([60, LENGTH_MAX])}
          >
            60 ft+
          </Chip>
        </div>
      </Section>

      {/* Year built */}
      <Section
        title="Year built"
        hint={`${year[0]} – ${year[1]}`}
        active={isYearActive ? 1 : 0}
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="From"
            value={year[0]}
            onChange={(n) => setYear([Math.min(n, year[1]), year[1]])}
            min={YEAR_MIN}
            max={CURRENT_YEAR}
          />
          <NumberField
            label="To"
            value={year[1]}
            onChange={(n) => setYear([year[0], Math.max(n, year[0])])}
            min={YEAR_MIN}
            max={CURRENT_YEAR}
          />
        </div>
        <div className="mt-5 px-1">
          <RangeSlider
            value={year}
            onValueChange={setYear}
            min={YEAR_MIN}
            max={CURRENT_YEAR}
            step={1}
          />
        </div>
      </Section>

      {/* Capacity */}
      <Section title="Capacity" active={capacityActive}>
        <div className="divide-y divide-gray-100">
          <Stepper
            label="Guests"
            value={guests}
            onChange={setGuests}
            min={1}
            max={50}
            unit="guests"
          />
          <Stepper
            label="Cabins"
            value={cabins}
            onChange={setCabins}
            min={0}
            max={10}
            unit="cabins"
          />
          <Stepper
            label="Bathrooms"
            value={bathrooms}
            onChange={setBathrooms}
            min={0}
            max={6}
            unit="bathrooms"
          />
        </div>
      </Section>

      {/* Boat type */}
      <Section title="Boat type" active={categories.length}>
        {loadingCats ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((c) => (
              <Chip
                key={c.category}
                active={categories.includes(c.category)}
                onClick={() => toggleCategory(c.category)}
              >
                {c.displayName}
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    categories.includes(c.category)
                      ? "text-white/70"
                      : "text-gray-400"
                  )}
                >
                  {c.count}
                </span>
              </Chip>
            ))}
          </div>
        )}
      </Section>

      {/* Features */}
      <Section title="Features" active={features.length}>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <Chip
              key={f.id}
              active={features.includes(f.id)}
              onClick={() => toggleFeature(f.id)}
              icon={f.icon}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </Section>
    </div>
  );

  // ---- Shared header / footer ----
  // pr-12 reserves room for DialogContent's built-in close (X) on desktop;
  // mobile drawer doesn't have one and the slight extra padding is harmless.
  const header = (
    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 pr-12 sm:px-6 sm:pr-14">
      <div className="min-w-0">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Filters
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Refine your search to find the perfect charter
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {totalActive > 0 ? (
          <>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
              {totalActive} active
            </span>
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Clear all
            </button>
          </>
        ) : null}
      </div>
    </div>
  );

  // Footer respects iOS safe-area on the bottom so the primary CTA never sits
  // under the home indicator when the drawer is anchored to the bottom edge.
  const footer = (
    <div className="flex items-center gap-3 border-t border-gray-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <Button
        type="button"
        variant="ghost"
        onClick={resetAll}
        className="hidden h-12 px-5 font-medium text-foreground hover:bg-gray-100 sm:inline-flex"
      >
        Reset
      </Button>
      <Button
        type="button"
        onClick={apply}
        disabled={isPending}
        className="h-12 flex-1 rounded-xl bg-primary text-base font-semibold text-white shadow-sm hover:bg-primary/90 sm:flex-none sm:px-8"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : totalActive > 0 ? (
          `Show results · ${totalActive} filter${totalActive === 1 ? "" : "s"}`
        ) : (
          "Show results"
        )}
      </Button>
    </div>
  );

  // ---- Render: Drawer (mobile) vs Dialog (desktop) ----
  //
  // Both shells use the same three-row vertical layout: fixed header, scrolling
  // body, fixed footer. We use flexbox (not grid) and explicitly add `min-h-0`
  // to the scrolling middle child so it can shrink below its content's
  // intrinsic size — without this, a flex/grid item refuses to be shorter than
  // its content, which makes `overflow-y-auto` silently no-op and the whole
  // dialog grows past the viewport. This is the canonical pattern for any
  // "header + scroll + footer" container with a max-height ceiling.
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="flex max-h-[92dvh] flex-col focus:outline-none">
          <DrawerTitle className="sr-only">Filters</DrawerTitle>
          <DrawerDescription className="sr-only">
            Refine your search to find the perfect charter
          </DrawerDescription>
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {body}
          </div>
          {footer}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[88vh] w-[min(96vw,640px)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[640px]">
        <DialogTitle className="sr-only">Filters</DialogTitle>
        <DialogDescription className="sr-only">
          Refine your search to find the perfect charter
        </DialogDescription>
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
