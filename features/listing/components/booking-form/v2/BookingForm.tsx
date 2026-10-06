"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, Clock, Users } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { cn, formatTime12Hour } from "@/shared/lib/utils/general-utils";
import { BookingRequest } from "@/features/_validation/validations";
import type { BookingPickerLayout } from "../shared/booking-picker-layout";

import { useBookingForm } from "./useBookingForm";
import type { PublicBoat } from "@/features/boats/boat.types";
import { BookingCalendar } from "./BookingCalendar";
import { BookingTimeList } from "./BookingTimeList";
import {
  CaptainToggle,
  DisclosureRow,
  DurationPills,
  GuestStepper,
  InfoTooltip,
  PriceBreakdown,
  PriceHeader,
} from "./fields";
import type { ServiceFee } from "@/shared/lib/utils/pricing-utils";

export type BookingVariant = "instant" | "request";

interface BookingFormProps {
  boat: PublicBoat;
  /** The card fee from app settings (rate + fixed), passed down from the server page. */
  serviceFee: ServiceFee;
  /** `instant` → payment flow, `request` → inquiry flow. Defaults to the boat's `instantBook` flag. */
  variant?: BookingVariant;
  /** `inline` inside the mobile drawer, `popover` on desktop. */
  layout?: BookingPickerLayout;
  /** Drop the outer card chrome (the mobile drawer is already the card). */
  bare?: boolean;
}

export function BookingForm({
  boat,
  serviceFee,
  variant = boat.instantBook ? "instant" : "request",
  layout = "popover",
  bare = false,
}: BookingFormProps) {
  const router = useRouter();
  const { form, activeTiers, date, setDate, time, setTime, selectedTier, isComplete, isValid } =
    useBookingForm({ boat });

  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  if (activeTiers.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <h3 className="mb-1 font-semibold text-foreground">No pricing available</h3>
        <p className="text-sm text-muted-foreground">
          This boat has no bookable pricing options right now.
        </p>
      </div>
    );
  }

  const handleSubmit = (data: BookingRequest) => {
    if (!selectedTier) {
      form.setError("pricingTierId", { message: "Please select a duration option" });
      return;
    }
    const params = new URLSearchParams({
      startDateTime: data.startDateTime,
      pricingTierId: selectedTier.id,
      numberOfPassengers: String(data.numberOfPassengers),
      needsCaptain: String(data.needsCaptain || false),
    });
    // Instant boats go to checkout ("Complete your charter"); everything else
    // goes straight to the inquiry funnel — no /details bounce in between.
    const target = variant === "instant" ? "details" : "inquiry";
    router.push(`/bookings/${boat.id}/${target}?${params.toString()}`);
  };

  const currency = boat.currency ?? "USD";
  const capacity = boat.capacity || 12;
  const isInstant = variant === "instant";

  const pricingTierId = form.watch("pricingTierId");
  const guests = form.watch("numberOfPassengers");
  const needsCaptain = form.watch("needsCaptain");

  return (
    <div
      className={cn(
        "w-full",
        !bare && "rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      )}
    >
      <PriceHeader tier={selectedTier} currency={currency} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          <DurationPills
            tiers={activeTiers}
            value={pricingTierId}
            onChange={(id) => form.setValue("pricingTierId", id, { shouldValidate: true })}
            currency={currency}
          />

          {/* Date · Time · Guests — one unified field group */}
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            <DisclosureRow
              icon={<CalendarDays className="size-5" />}
              label="Date"
              value={date ? format(date, "EEE, MMM d, yyyy") : undefined}
              placeholder="Select date"
              open={dateOpen}
              onOpenChange={setDateOpen}
              layout={layout}
            >
              <BookingCalendar
                boatId={boat.id}
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  // A time valid for the old day may not exist on the new one.
                  setTime("");
                  setDateOpen(false);
                  setTimeOpen(true);
                }}
              />
            </DisclosureRow>

            <DisclosureRow
              icon={<Clock className="size-5" />}
              label="Start time"
              value={time ? formatTime12Hour(time) : undefined}
              placeholder={date ? "Select start time" : "Select a date first"}
              disabled={!date}
              open={timeOpen}
              onOpenChange={setTimeOpen}
              layout={layout}
            >
              {date && (
                <BookingTimeList
                  date={date}
                  boat={boat}
                  durationHours={selectedTier?.hours ?? 4}
                  selectedTime={time}
                  onSelect={(t) => {
                    setTime(t);
                    setTimeOpen(false);
                  }}
                />
              )}
            </DisclosureRow>

            <GuestStepper
              icon={<Users className="size-5" />}
              value={guests}
              max={capacity}
              onChange={(n) => form.setValue("numberOfPassengers", n, { shouldValidate: true })}
            />
          </div>

          {!boat.crewRequired && (
            <CaptainToggle
              value={needsCaptain}
              onChange={(v) => form.setValue("needsCaptain", v, { shouldValidate: true })}
            />
          )}

          {isComplete && selectedTier && (
            <PriceBreakdown
              tier={selectedTier}
              cleaningFee={boat.cleaningFee || 0}
              currency={currency}
              serviceFee={serviceFee}
            />
          )}

          <div className="pt-1">
            <Button
              type="submit"
              disabled={!isValid}
              className="h-12 w-full rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90"
            >
              Continue
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
              You won&apos;t be charged yet
              <InfoTooltip label="About charges">
                {isInstant
                  ? "Continuing takes you to a secure checkout to review everything. No payment is taken until you confirm on the next step."
                  : "Continuing sends a booking request to the owner. It's not a payment — you'll only be charged if the request is approved and you confirm."}
              </InfoTooltip>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
