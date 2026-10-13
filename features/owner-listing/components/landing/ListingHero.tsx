"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Info } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils/general-utils";
import { estimateEarnings, estimateGroupFor, type ComparableBoat } from "../../estimate";
import {
  BUILD_YEARS,
  LISTING_BOAT_TYPES,
  PLACEHOLDER_KOS_FEE_PERCENT,
} from "../../listing.constants";
import {
  MakePicker,
  ModelPicker,
  modelForMake,
} from "@/features/boat-catalog/components/CatalogPicker";
import type { CatalogMake } from "@/features/boat-catalog/boat-catalog.types";
import { basicsSchema } from "../../listing.validation";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

/** The estimate assumes this many 4-hour trips a month (Boatsetter assumes eight 8-hour ones). */
const TRIPS_PER_MONTH = 8;

export const goldButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold-glow px-7 text-[15px] font-bold text-primary shadow-[0_8px_24px_-10px_rgba(178,163,122,0.9)] transition-colors hover:bg-[#cdbd85] disabled:opacity-60";

const fieldClass =
  "h-12 rounded-xl border-gray-200 bg-white text-[15px] text-slate-900 placeholder:text-slate-400";

function Labeled({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

/**
 * The page opener: a full-bleed photo, the pitch, and a card that is the
 * listing's first step. Its answers price the boat live and carry straight
 * into the flow, so the owner never types them twice.
 */
export function ListingHero({
  boats,
  catalog,
}: {
  boats: ComparableBoat[];
  catalog: CatalogMake[];
}) {
  const router = useRouter();
  const card = useRef<HTMLFormElement>(null);
  const [showBar, setShowBar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [values, setValues] = useState({
    category: "YACHT",
    make: "",
    model: "",
    yearBuilt: "",
    lengthFt: "",
    capacity: "",
  });
  const set =
    (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const length = Number(values.lengthFt);
  const estimate = useMemo(
    () =>
      length >= 12
        ? estimateEarnings(boats, {
            group: estimateGroupFor(values.category),
            lengthFt: length,
            hours: 4,
            tripsPerMonth: TRIPS_PER_MONTH,
          })
        : null,
    [boats, values.category, length]
  );
  const monthly = estimate
    ? Math.round((estimate.monthlyLow + estimate.monthlyHigh) / 2 / 50) * 50
    : null;

  // The bottom bar takes over once the card scrolls away, and steps aside
  // when the closing call to action (#list-cta-end) is on screen or passed.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const cardBottom = card.current?.getBoundingClientRect().bottom ?? 0;
      const endTop = document.getElementById("list-cta-end")?.getBoundingClientRect().top;
      setShowBar(cardBottom < 0 && (endTop === undefined || endTop > window.innerHeight));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  function start(e: FormEvent) {
    e.preventDefault();
    const check = basicsSchema.safeParse(values);
    if (!check.success) {
      setErrors(check.error.flatten().fieldErrors);
      return;
    }
    // Signed in: the listing is created there. Not yet: the account step opens there.
    router.push(`/list-your-boat/start?${new URLSearchParams({ ...values, resume: "1" })}`);
  }

  function backToCard() {
    card.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    card.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }

  const err = (key: string) => errors[key]?.[0];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-primary">
        <Image
          src="/images/services/charter-management2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_40%]"
        />

        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:min-h-[640px] lg:grid-cols-12 lg:gap-12 lg:py-24">
          <div className="text-white [text-shadow:0_2px_18px_rgba(0,20,35,0.55),0_1px_3px_rgba(0,20,35,0.45)] lg:col-span-6">
            <h1 className="text-[2.6rem] leading-[1.04] font-black tracking-tight sm:text-6xl">
              Put your boat <br className="hidden sm:block" />
              to work.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed font-semibold text-white lg:max-w-[25rem] xl:max-w-[27rem]">
              List it on KOS and it books alongside a fleet guests charter every week. You set the
              prices. Our team handles the guests, the crew and the details.
            </p>
          </div>

          <form
            ref={card}
            onSubmit={start}
            noValidate
            className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-30px_rgba(10,20,30,0.7)] sm:p-8 lg:col-span-6 lg:ml-auto lg:max-w-[480px]"
          >
            <h2 className="text-xl font-bold tracking-tight text-primary">
              What could your boat earn?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This starts your listing. Change anything later.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Labeled label="Boat type">
                  <select
                    value={values.category}
                    onChange={set("category")}
                    className={cn(fieldClass, "w-full border px-3")}
                  >
                    {LISTING_BOAT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Labeled>
              </div>
              <Labeled label="Make" error={err("make")}>
                <MakePicker
                  mode="other"
                  catalog={catalog}
                  value={values.make}
                  // A new make starts its model over.
                  onChange={(make) =>
                    setValues((v) => ({ ...v, make, model: modelForMake(make, v) }))
                  }
                  invalid={Boolean(err("make"))}
                  className={cn(fieldClass, "border")}
                />
              </Labeled>
              <Labeled label="Model" error={err("model")}>
                <ModelPicker
                  mode="other"
                  catalog={catalog}
                  make={values.make}
                  value={values.model}
                  onChange={(model) => setValues((v) => ({ ...v, model }))}
                  invalid={Boolean(err("model"))}
                  className={cn(fieldClass, "border")}
                />
              </Labeled>
              <div className="col-span-2 grid grid-cols-3 gap-3">
                <Labeled label="Year" error={err("yearBuilt")}>
                  <select
                    value={values.yearBuilt}
                    onChange={set("yearBuilt")}
                    className={cn(
                      fieldClass,
                      "w-full border px-3",
                      !values.yearBuilt && "text-slate-400"
                    )}
                  >
                    <option value="">Year</option>
                    {BUILD_YEARS.map((y) => (
                      <option key={y} value={y} className="text-slate-900">
                        {y}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Length (ft)" error={err("lengthFt")}>
                  <Input
                    inputMode="numeric"
                    value={values.lengthFt}
                    onChange={set("lengthFt")}
                    placeholder="55"
                    className={fieldClass}
                  />
                </Labeled>
                <Labeled label="Guests" error={err("capacity")}>
                  <Input
                    inputMode="numeric"
                    value={values.capacity}
                    onChange={set("capacity")}
                    placeholder="12"
                    className={fieldClass}
                  />
                </Labeled>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#f7f4ee] p-5" aria-live="polite">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                Estimated monthly earnings
                <span className="group relative">
                  <Info className="h-4 w-4 text-slate-400" aria-hidden />
                  <span className="pointer-events-none absolute -right-8 bottom-6 z-10 hidden w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-5 font-normal text-white shadow-lg group-hover:block sm:right-auto sm:left-1/2 sm:w-60 sm:-translate-x-1/2">
                    {TRIPS_PER_MONTH} four-hour trips a month at what KOS boats like yours book for,
                    after a {PLACEHOLDER_KOS_FEE_PERCENT}% KOS fee. The fee isn&apos;t final.
                  </span>
                </span>
              </div>
              <p className="mt-1 text-4xl font-black tracking-tight text-primary tabular-nums">
                {monthly !== null ? usd(monthly) : <span className="text-slate-300">$0</span>}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {estimate
                  ? `Boats like yours book for ${usd(estimate.low)}–${usd(estimate.high)} per 4-hour trip · ${estimate.sample} comparable KOS boats`
                  : length >= 12
                    ? "Not enough boats like this one to compare yet. The team will price it with you."
                    : "Add the length to see an estimate."}
              </p>
            </div>

            <button type="submit" className={cn(goldButton, "mt-5 w-full")}>
              Get started <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </section>

      {/* Boatsetter-style bar that follows the owner down the page. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur transition-transform duration-300",
          showBar ? "translate-y-0" : "translate-y-full"
        )}
        aria-hidden={!showBar}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <p className="text-sm font-semibold text-primary sm:text-base">
            {monthly !== null ? (
              <>
                Boats like yours earn about <span className="tabular-nums">{usd(monthly)}</span> a
                month
              </>
            ) : (
              "See what your boat could earn on KOS"
            )}
          </p>
          <button
            type="button"
            onClick={backToCard}
            tabIndex={showBar ? 0 : -1}
            className={cn(goldButton, "h-11 shrink-0 px-6 text-sm")}
          >
            List your boat
          </button>
        </div>
      </div>
    </>
  );
}
