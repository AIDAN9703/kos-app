"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils/general-utils";
import {
  CAPTAIN_ARRANGEMENTS,
  DEFAULT_MARKUP_PERCENT,
  TRIP_LENGTHS,
  guestPriceFor,
  listingStepHref,
  ownerShareOf,
} from "../../listing.constants";
import type { ListingDraft } from "../../listing.types";
import { ChoiceCard, fieldError } from "../fields";
import { StepFooter } from "../StepFooter";
import { useStepSave } from "../useStepSave";
import { usePreviewPatch } from "../preview/ListingPreview";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

/** Guest-price range of comparable KOS boats, per trip length we can compare. */
export type PriceHints = Partial<Record<number, { low: number; high: number }>>;

export function TripsForm({
  draft,
  advance,
  hints,
}: {
  draft: ListingDraft;
  advance: boolean;
  hints: PriceHints;
}) {
  const { save, pending, fieldErrors, formError } = useStepSave(draft.id, "trips", advance);
  const markup = draft.markupPercent ?? DEFAULT_MARKUP_PERCENT;
  // What the owner earns per length (older tiers only have a guest price).
  const existing = new Map(
    draft.trips.map((t) => [t.hours, t.ownerRate ?? ownerShareOf(t.price, markup)])
  );
  const [prices, setPrices] = useState<Record<number, { on: boolean; price: string }>>(() =>
    Object.fromEntries(
      TRIP_LENGTHS.map((h) => [
        h,
        {
          on: existing.size ? existing.has(h) : h === 4 || h === 6 || h === 8,
          price: existing.get(h)?.toString() ?? "",
        },
      ])
    )
  );
  const [captain, setCaptain] = useState(draft.captainArrangement ?? "");
  const [fuelIncluded, setFuelIncluded] = useState(draft.fuelIncluded);

  const patch = usePreviewPatch();
  useEffect(() => {
    // The preview shows what guests pay.
    const priced = TRIP_LENGTHS.filter((h) => prices[h].on && Number(prices[h].price) > 0).map(
      (h) => ({ hours: h, price: guestPriceFor(Number(prices[h].price), markup) })
    );
    patch({
      fromPrice: priced.length ? priced.reduce((a, b) => (b.price < a.price ? b : a)) : null,
    });
  }, [prices, patch, markup]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save({
      trips: TRIP_LENGTHS.filter((h) => prices[h].on).map((h) => ({
        hours: h,
        rate: prices[h].price,
      })),
      captainArrangement: captain,
      fuelIncluded,
    });
  }

  const tripsError = fieldError(fieldErrors, "trips");

  return (
    <form onSubmit={handleSubmit} className="space-y-10" noValidate>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">
          Trip lengths and what you earn
        </legend>
        <ul className="mt-3 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {TRIP_LENGTHS.map((h) => {
            const row = prices[h];
            const price = Number(row.price);
            const hint = hints[h];
            return (
              <li key={h} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <label className="flex min-w-32 cursor-pointer items-center gap-3">
                  <Switch
                    checked={row.on}
                    onCheckedChange={(on) => setPrices((p) => ({ ...p, [h]: { ...p[h], on } }))}
                    aria-label={`Offer ${h}-hour trips`}
                  />
                  <span
                    className={cn(
                      "text-[15px] font-semibold",
                      row.on ? "text-primary" : "text-slate-400"
                    )}
                  >
                    {h} hours
                  </span>
                </label>
                {row.on ? (
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <div className="relative w-36">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">
                        $
                      </span>
                      <Input
                        inputMode="numeric"
                        value={row.price}
                        onChange={(e) =>
                          setPrices((p) => ({
                            ...p,
                            [h]: { ...p[h], price: e.target.value.replace(/[^\d.]/g, "") },
                          }))
                        }
                        placeholder={hint ? String(ownerShareOf(hint.low, markup)) : "0"}
                        className="pl-7 text-right tabular-nums"
                        aria-label={`What you earn for ${h} hours`}
                      />
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {price > 0
                        ? `Guests pay ${usd(guestPriceFor(price, markup))}`
                        : hint
                          ? `Similar boats earn ${usd(ownerShareOf(hint.low, markup))}–${usd(ownerShareOf(hint.high, markup))}`
                          : "What you earn"}
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p
          className={cn(
            "mt-3 text-sm leading-6",
            tripsError ? "text-destructive" : "text-slate-500"
          )}
        >
          {tripsError ??
            `This is what KOS pays you for each trip. Guests see your rate plus KOS's fee (${markup}%), and the team confirms the prices before your boat goes live.`}
        </p>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Who captains the boat?</legend>
        <div className="mt-3 grid gap-2.5">
          {CAPTAIN_ARRANGEMENTS.map((option) => (
            <ChoiceCard
              key={option.value}
              name="captain"
              title={option.label}
              detail={option.hint}
              selected={captain === option.value}
              onSelect={() => setCaptain(option.value)}
            />
          ))}
        </div>
        {fieldError(fieldErrors, "captainArrangement") ? (
          <p className="mt-2 text-sm text-destructive">Pick who captains the boat.</p>
        ) : null}
      </fieldset>

      <label className="flex cursor-pointer items-start justify-between gap-6 rounded-xl border border-gray-200 bg-white px-4 py-3.5">
        <span>
          <span className="block text-[15px] font-semibold text-primary">
            Fuel included in the price
          </span>
          <span className="mt-0.5 block text-sm leading-6 text-slate-500">
            Off means guests pay for fuel used after the trip.
          </span>
        </span>
        <Switch checked={fuelIncluded} onCheckedChange={setFuelIncluded} className="mt-1" />
      </label>

      <StepFooter
        backHref={listingStepHref(draft.id, "details")}
        pending={pending}
        label={advance ? "Save and continue" : "Save changes"}
        error={formError}
      />
    </form>
  );
}
