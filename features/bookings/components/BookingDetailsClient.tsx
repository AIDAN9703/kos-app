"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsString, parseAsInteger, parseAsBoolean } from "nuqs";
import { Loader2 } from "lucide-react";

import BookingSummary from "./BookingSummary";
import KnowBeforeYouGo from "./KnowBeforeYouGo";
import BookingPricingSection from "./BookingPricingSection";
import BookingSubmitButton from "./BookingSubmitButton";
import CharterDetailsForm from "./CharterDetailsForm";
import { AddOnsPicker } from "@/features/listing/components/booking-form/v2/fields";
import { useBoat } from "./BoatProvider";
import { calculateBookingPriceCents, type ServiceFee } from "@/shared/lib/utils/pricing-utils";
import { dollarsToCents, formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { BookingRequest } from "@/features/_validation/validations";
import { toast } from "@/shared/lib/hooks/use-toast";
import type { Session } from "next-auth";

const BookingAuthSection = dynamic(() => import("./BookingAuthSection"), {
  ssr: false,
});

export default function BookingDetailsClient({
  user,
  serviceFee,
}: {
  user: Session["user"] | null;
  /** The card fee from app settings (rate + fixed), passed down from the server page. */
  serviceFee: ServiceFee;
}) {
  const router = useRouter();
  const boat = useBoat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authModal, setAuthModal] = useState<
    "menu" | "sign-in" | "sign-up" | null
  >(null);

  const [bookingState, setBookingState] = useQueryStates({
    startDateTime: parseAsString,
    pricingTierId: parseAsString,
    numberOfPassengers: parseAsInteger.withDefault(1),
    needsCaptain: parseAsBoolean.withDefault(false),
    addOns: parseAsString,
  });

  const { startDateTime, pricingTierId, numberOfPassengers, needsCaptain, addOns } = bookingState;
  const isFormComplete = !!(startDateTime && pricingTierId && numberOfPassengers);

  // Paid add-on selection from the URL ([{addOnId, quantity}]). Prices are
  // always re-resolved on the server; this is only for the preview + payload.
  const selectedAddOns = useMemo<{ addOnId: string; quantity: number }[]>(() => {
    if (!addOns) return [];
    try {
      const parsed = JSON.parse(addOns);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [addOns]);

  // Resolve against the boat's offerings for the displayed breakdown:
  // complimentary auto-included + selected paid.
  const previewAddOns = useMemo(() => {
    const offered = (boat.boatAddOns ?? []).filter((a) => a.isActive);
    const qtyById = new Map(selectedAddOns.map((s) => [s.addOnId, s.quantity]));
    return offered
      .map((a) => {
        if (a.isComplimentary) {
          return { name: a.name, quantity: 1, total: 0, isComplimentary: true };
        }
        const qty = qtyById.get(a.addOnId) ?? 0;
        if (qty <= 0) return null;
        return {
          name: a.name,
          quantity: qty,
          total: (a.priceCents * qty) / 100,
          isComplimentary: false,
        };
      })
      .filter((x): x is { name: string; quantity: number; total: number; isComplimentary: boolean } => x !== null);
  }, [boat.boatAddOns, selectedAddOns]);

  // Interactive add-on selection lives on THIS page. Quantities are written back
  // to the `addOns` URL param so they survive refresh + the sign-in round-trip.
  const offeredAddOns = useMemo(
    () => (boat.boatAddOns ?? []).filter((a) => a.isActive),
    [boat.boatAddOns],
  );
  const hasAddOns = offeredAddOns.length > 0;
  const addOnQuantities = useMemo(
    () => Object.fromEntries(selectedAddOns.map((s) => [s.addOnId, s.quantity])),
    [selectedAddOns],
  );
  const handleAddOnChange = useCallback(
    (addOnId: string, quantity: number) => {
      const next = selectedAddOns.filter((s) => s.addOnId !== addOnId);
      if (quantity > 0) next.push({ addOnId, quantity });
      setBookingState({ addOns: next.length > 0 ? JSON.stringify(next) : null });
    },
    [selectedAddOns, setBookingState],
  );

  useEffect(() => {
    if (!isFormComplete) {
      if (process.env.NODE_ENV === "development") {
        console.log("❌ No booking data found, redirecting to boat page");
      }
      router.push(`/boats/${boat.id}`);
      return;
    }

    if (!boat.instantBook) {
      const params = new URLSearchParams();
      if (startDateTime) params.set("startDateTime", startDateTime);
      if (pricingTierId) params.set("pricingTierId", pricingTierId);
      if (numberOfPassengers) params.set("numberOfPassengers", String(numberOfPassengers));
      if (needsCaptain) params.set("needsCaptain", "true");
      if (addOns) params.set("addOns", addOns);
      router.replace(`/bookings/${boat.id}/inquiry?${params.toString()}`);
    }
  }, [
    isFormComplete,
    boat.id,
    boat.instantBook,
    router,
    startDateTime,
    pricingTierId,
    numberOfPassengers,
    needsCaptain,
    addOns,
  ]);

  const selectedTier = useMemo(() => {
    return boat.pricingTiers?.find((t) => t.id === pricingTierId) || null;
  }, [boat.pricingTiers, pricingTierId]);

  const priceBreakdown = useMemo(() => {
    if (!selectedTier || !boat) return null;
    return calculateBookingPriceCents(dollarsToCents(selectedTier.price), dollarsToCents(boat.cleaningFee || 0), 0, 0, serviceFee);
  }, [selectedTier, boat, serviceFee]);

  const safeBoat = useMemo(
    () => ({
      id: boat.id,
      name: boat.name,
      mainImage: boat.mainImage ?? null,
      instantBook: !!boat.instantBook,
      cleaningFee: boat.cleaningFee ?? null,
      locationLabel: boat.locationLabel ?? null,
      timezone: (boat.timezone as string | null) ?? null,
      currency: boat.currency ?? "USD",
    }),
    [boat],
  );

  const totalLabel = useMemo(() => {
    if (!priceBreakdown) return "";
    return formatCentsAsCurrency(priceBreakdown.totalPriceCents, { currency: safeBoat.currency });
  }, [priceBreakdown, safeBoat.currency]);

  const handleBookingSubmit = useCallback(
    async () => {
      if (!isFormComplete || !boat || !priceBreakdown) {
        return;
      }
      if (!user) {
        setAuthModal("menu");
        return;
      }

      setIsSubmitting(true);

      try {
        const payload: BookingRequest & { boatId: string } = {
          startDateTime: startDateTime!,
          pricingTierId: selectedTier!.id,
          numberOfPassengers: numberOfPassengers!,
          needsCaptain: !!needsCaptain,
          boatId: boat.id,
          ...(selectedAddOns.length > 0 ? { addOns: selectedAddOns } : {}),
        };

        const { createInstantBooking } = await import("@/features/bookings/actions/instant");
        const result = await createInstantBooking(payload);

        if (result?.success && "paymentUrl" in result && result.paymentUrl) {
          window.location.href = result.paymentUrl;
          return;
        }

        toast({
          title: "Could not start checkout",
          description: result?.error ?? "Please try again.",
          variant: "destructive",
        });
      } catch (error) {
        console.error("Booking submission error:", error);
        toast({
          title: "Something went wrong",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isFormComplete,
      user,
      boat,
      startDateTime,
      selectedTier,
      numberOfPassengers,
      needsCaptain,
      selectedAddOns,
      priceBreakdown,
    ],
  );

  if (!isFormComplete || !selectedTier) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-28 lg:pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-8 sm:px-6 sm:pt-12 sm:pb-10 lg:px-8 lg:pt-14 lg:pb-12">
        <header className="mb-8 sm:mb-10">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            You&apos;re almost there
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Complete your charter
          </h1>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0">
            <BookingSummary
              boat={safeBoat}
              selectedTier={selectedTier}
              bookingData={{
                startDateTime: startDateTime!,
                numberOfPassengers: numberOfPassengers!,
              }}
            />

            {hasAddOns && (
              <div className="mt-5 border-t border-gray-100 pt-5 sm:mt-6 sm:pt-6">
                <AddOnsPicker
                  addOns={offeredAddOns}
                  quantities={addOnQuantities}
                  onChange={handleAddOnChange}
                  currency={safeBoat.currency}
                />
              </div>
            )}

            <div className="mt-5 border-t border-gray-100 pt-5 sm:mt-6 sm:pt-6">
              <CharterDetailsForm />
            </div>

            <div className="mt-8 space-y-6 border-t border-gray-100 pt-5 sm:mt-9 sm:pt-6 lg:hidden">
              <KnowBeforeYouGo boatName={boat.name} />
              <BookingPricingSection
                boat={safeBoat}
                selectedTier={selectedTier}
                serviceFee={serviceFee}
                addOns={previewAddOns}
              />
            </div>
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6 rounded-2xl bg-gray-50 p-6">
              <KnowBeforeYouGo boatName={boat.name} />
              <BookingPricingSection
                boat={safeBoat}
                selectedTier={selectedTier}
                serviceFee={serviceFee}
                addOns={previewAddOns}
              />
              <BookingSubmitButton
                user={user}
                isSubmitting={isSubmitting}
                onSubmit={handleBookingSubmit}
                onNeedAuth={() => setAuthModal("menu")}
              />
            </div>
          </aside>
        </div>

        <BookingAuthSection
          authModal={authModal}
          onAuthModalChange={setAuthModal}
        />
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90 lg:hidden safe-area-pb">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {totalLabel}
            </p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="ml-auto shrink-0">
            <BookingSubmitButton
              user={user}
              isSubmitting={isSubmitting}
              onSubmit={handleBookingSubmit}
              onNeedAuth={() => setAuthModal("menu")}
              layout="bar"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
