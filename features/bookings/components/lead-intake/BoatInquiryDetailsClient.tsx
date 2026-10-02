"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsString, parseAsInteger, parseAsBoolean } from "nuqs";
import { Check, Clock, Loader2 } from "lucide-react";

import BookingSummary from "@/features/bookings/components/BookingSummary";
import BookingPricingSection from "@/features/bookings/components/BookingPricingSection";
import KnowBeforeYouGo from "@/features/bookings/components/KnowBeforeYouGo";
import { useBoat } from "@/features/bookings/components/BoatProvider";
import { Button } from "@/shared/components/ui/button";
import { calculateBookingPriceCents, type ServiceFee } from "@/shared/lib/utils/pricing-utils";
import { dollarsToCents, formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { toast } from "@/shared/lib/hooks/use-toast";
import { createBoatLead } from "@/features/bookings/actions/lead-intake.actions";
import type { BoatMemberInquiryContactFormData } from "@/shared/lib/validation/inquiry";
import InquiryContactForm from "@/features/bookings/components/lead-intake/InquiryContactForm";
import type { BookingAuthModalView } from "@/features/bookings/components/BookingAuthSection";

const BookingAuthSection = dynamic(
  () => import("@/features/bookings/components/BookingAuthSection"),
  { ssr: false }
);

/** Signed-in visitor's account details, resolved by the server page. */
export interface InquiryCurrentUser {
  firstName: string;
  name: string;
  email: string;
  phone: string;
}

/**
 * Soft urgency: a 10-minute "held for" countdown. Purely presentational —
 * nothing expires server-side; it floors at 0:00.
 */
function HoldTimer() {
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold tabular-nums text-amber-700">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      Held for {mm}:{ss}
    </span>
  );
}

export default function BoatInquiryDetailsClient({
  serviceFee,
  currentUser,
}: {
  /** The card fee from app settings (rate + fixed), passed down from the server page. */
  serviceFee: ServiceFee;
  currentUser: InquiryCurrentUser | null;
}) {
  const router = useRouter();
  const boat = useBoat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authModal, setAuthModal] = useState<BookingAuthModalView>(null);

  const [inquiryState] = useQueryStates({
    startDateTime: parseAsString,
    pricingTierId: parseAsString,
    numberOfPassengers: parseAsInteger.withDefault(1),
    needsCaptain: parseAsBoolean.withDefault(false),
  });

  const { startDateTime, pricingTierId, numberOfPassengers, needsCaptain } = inquiryState;
  const isTripComplete = !!(startDateTime && pricingTierId && numberOfPassengers);

  useEffect(() => {
    if (!isTripComplete) {
      router.push(`/boats/${boat.id}`);
    }
  }, [isTripComplete, boat.id, router]);

  const selectedTier = useMemo(
    () => boat.pricingTiers?.find((t) => t.id === pricingTierId) || null,
    [boat.pricingTiers, pricingTierId]
  );

  const priceBreakdown = useMemo(() => {
    if (!selectedTier) return null;
    return calculateBookingPriceCents(dollarsToCents(selectedTier.price), dollarsToCents(boat.cleaningFee || 0), 0, 0, serviceFee);
  }, [selectedTier, boat.cleaningFee, serviceFee]);

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
    [boat]
  );

  const totalLabel = useMemo(() => {
    if (!priceBreakdown) return "";
    return formatCentsAsCurrency(priceBreakdown.totalPriceCents, { currency: safeBoat.currency });
  }, [priceBreakdown, safeBoat.currency]);

  const handleContactSubmit = useCallback(
    async (contact: BoatMemberInquiryContactFormData) => {
      if (!isTripComplete || !selectedTier || !startDateTime) return;

      setIsSubmitting(true);
      try {
        const result = await createBoatLead({
          boatId: boat.id,
          startDateTime,
          pricingTierId: selectedTier.id,
          numberOfPassengers,
          needsCaptain: !!needsCaptain,
          ...contact,
        });

        if (result.success && result.bookingId) {
          // CRM sync happens server-side inside createBoatLead.
          setSubmitted(true);
          toast({
            title: "Request submitted",
            description: result.message,
          });
        } else {
          toast({
            title: "Could not submit request",
            description: result.error ?? "Please try again.",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      boat.id,
      isTripComplete,
      needsCaptain,
      numberOfPassengers,
      selectedTier,
      startDateTime,
    ]
  );

  if (!isTripComplete || !selectedTier) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    const nextSteps = [
      {
        title: "We check availability",
        body: `Our crew confirms ${boat.name} is free for your date.`,
      },
      {
        title: "You get a proposal",
        body: "A personal link with your trip and pricing, by email.",
      },
      {
        title: "Accept & set sail",
        body: "Review, accept, and pay online — that's it.",
      },
    ];
    return (
      <div className="min-h-screen bg-white pb-16">
        <div className="mx-auto max-w-lg px-4 py-14 sm:py-20">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-7 w-7 text-primary" strokeWidth={2.5} />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Request received
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              You&apos;re one step closer to a day on <span className="font-medium text-foreground">{boat.name}</span>.
            </p>
          </div>

          <ol className="mt-9 space-y-5">
            {nextSteps.map((step, i) => (
              <li key={step.title} className="flex items-start gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="h-11 rounded-full px-6">
              <a href={`/boats/${boat.id}`}>Back to boat</a>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6">
              <Link href="/boats/search">Explore more yachts</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const requestButton = currentUser ? (
    <Button
      type="submit"
      form="inquiry-contact-form"
      disabled={isSubmitting}
      className="h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
    >
      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request availability"}
    </Button>
  ) : (
    <Button
      type="button"
      onClick={() => setAuthModal("menu")}
      className="h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
    >
      Continue
    </Button>
  );

  return (
    <div className="min-h-screen bg-white pb-28 lg:pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-8 sm:px-6 sm:pt-12 sm:pb-10 lg:px-8 lg:pt-14 lg:pb-12">
        <header className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              You&apos;re almost there
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Complete your request
            </h1>
          </div>
          <HoldTimer />
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0">
            <BookingSummary
              boat={safeBoat}
              selectedTier={selectedTier}
              bookingData={{
                startDateTime: startDateTime!,
                numberOfPassengers,
              }}
            />

            {/* Signed out, this section says nothing — the Continue button in the pricing rail (and the mobile bar) is
                the one door into auth. */}
            {currentUser ? (
              <div className="mt-5 border-t border-gray-100 pt-5 sm:mt-6 sm:pt-6">
                <InquiryContactForm
                  currentUser={currentUser}
                  onSubmit={handleContactSubmit}
                  isSubmitting={isSubmitting}
                />
              </div>
            ) : null}

            <div className="mt-8 space-y-6 border-t border-gray-100 pt-5 sm:mt-9 sm:pt-6 lg:hidden">
              <KnowBeforeYouGo boatName={boat.name} />
              <BookingPricingSection
                boat={safeBoat}
                selectedTier={selectedTier}
                serviceFee={serviceFee}
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
              />
              {requestButton}
              <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                No payment required. Our team will confirm availability and follow up.
              </p>
            </div>
          </aside>
        </div>

        <BookingAuthSection authModal={authModal} onAuthModalChange={setAuthModal} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90 lg:hidden safe-area-pb">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {totalLabel}
            </p>
            <p className="text-sm text-muted-foreground">Estimated total</p>
          </div>
          <div className="shrink-0">
            {currentUser ? (
              <Button
                type="submit"
                form="inquiry-contact-form"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setAuthModal("menu")}
                className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
