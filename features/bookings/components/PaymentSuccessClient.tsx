"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import confetti from "canvas-confetti";

/* Brand confetti — navy + golds, not the rainbow. */
const BRAND_COLORS = ["#27445c", "#b2a37a", "#d4c590", "#3a5a7a"];

function fireConfetti() {
  const bigBoat = confetti.shapeFromText({ text: "\u{1F6E5}️", scalar: 5 });
  const bigSailboat = confetti.shapeFromText({ text: "⛵", scalar: 5 });
  const bigWave = confetti.shapeFromText({ text: "\u{1F30A}", scalar: 4 });

  confetti({
    particleCount: 50,
    spread: 100,
    origin: { y: 1.0, x: 0.5 },
    colors: BRAND_COLORS,
    shapes: [bigBoat, bigSailboat],
    scalar: 2,
    gravity: 0.6,
    startVelocity: 60,
    ticks: 500,
    disableForReducedMotion: true,
  });

  setTimeout(() => {
    confetti({
      particleCount: 35,
      angle: 45,
      spread: 80,
      origin: { x: -0.2, y: 1.0 },
      colors: BRAND_COLORS,
      shapes: [bigWave, bigSailboat],
      scalar: 2,
      gravity: 0.7,
      startVelocity: 50,
      ticks: 400,
      disableForReducedMotion: true,
    });
  }, 400);
}

interface BookingSummary {
  id: string;
  bookingType: string;
  customerName: string;
  startDateTime: string;
  endDateTime: string | null;
  numberOfPassengers: number;
  boatName: string | null;
  boatCategory: string | null;
  boatMainImage: string | null;
  boatTimezone: string | null;
  totalAmountCents: number | null;
  basePriceCents: number | null;
  cleaningFeeCents: number | null;
  serviceFeeCents: number | null;
  captainFeeCents: number | null;
  depositAmountCents: number | null;
  /** Settled by this checkout session. */
  paidNowCents?: number;
  /** Everything settled on the booking so far. */
  totalPaidCents?: number;
  /** Still owed before the trip (0 when paid in full). */
  remainingCents?: number;
}

type VerifyState = "loading" | "verified" | "processing" | "error";

/** Hairline fact row — the site's flat detail grammar. */
function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-right text-sm font-medium text-primary">{value}</span>
    </div>
  );
}

export default function PaymentSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const cancelled = searchParams.get("cancelled");

  const [state, setState] = useState<VerifyState>("loading");
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const verify = useCallback(async () => {
    if (!sessionId) return; // rendered as an error state directly

    try {
      const res = await fetch(`/api/stripe/verify?session_id=${sessionId}`);
      const data = await res.json();

      if (res.status === 202) {
        // Webhook hasn't processed yet — retry with backoff
        setState("processing");
        const delay = Math.min(2000 * Math.pow(1.5, retryCount), 10000);
        setTimeout(() => setRetryCount((c) => c + 1), delay);
        return;
      }

      if (res.ok && data.success && data.bookingId) {
        setBooking(data.booking);
        setState("verified");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }, [sessionId, retryCount]);

  useEffect(() => {
    // Guests don't have a profile — home is the only safe landing.
    if (cancelled) {
      router.push("/");
      return;
    }
    verify();
  }, [verify, cancelled, router]);

  useEffect(() => {
    if (state === "verified") {
      setTimeout(() => {
        setShowAnimation(true);
        setTimeout(() => fireConfetti(), 500);
      }, 100);
    }
  }, [state]);

  useEffect(() => {
    if (state === "error" || !sessionId) {
      const timer = setTimeout(() => router.push("/"), 6000);
      return () => clearTimeout(timer);
    }
  }, [state, sessionId, router]);

  if (state === "error" || !sessionId) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="mx-auto max-w-md px-6 text-center">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-primary">
            We couldn&apos;t verify your payment.
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            If you completed checkout, don&apos;t worry — your payment is safe and our team will
            confirm it shortly. Call or text{" "}
            <a href="tel:+13055218877" className="font-medium text-primary">
              (305) 521-8877
            </a>{" "}
            if you&apos;d like a hand.
          </p>
          <Button asChild size="lg" className="mt-8 h-11 rounded-full px-7">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state === "loading" || state === "processing") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-slate-600">
            {state === "processing" ? "Finalizing your booking…" : "Confirming your payment…"}
          </p>
        </div>
      </div>
    );
  }

  // Boat-local: the customer must read the same hour the captain expects them,
  // wherever they're sitting when the confirmation loads.
  const bookingDate = booking?.startDateTime
    ? formatBoatLocal(
        booking.startDateTime,
        booking.boatTimezone,
        "EEEE, MMM d, yyyy 'at' h:mm a zzz"
      )
    : null;

  const duration =
    booking?.startDateTime && booking?.endDateTime
      ? Math.round(
          (new Date(booking.endDateTime).getTime() -
            new Date(booking.startDateTime).getTime()) /
            (1000 * 60 * 60)
        )
      : null;

  const paidNowCents = booking?.paidNowCents ?? 0;
  const remainingCents = booking?.remainingCents ?? 0;

  const priceRows: { label: string; cents: number }[] = [
    { label: "Base price", cents: booking?.basePriceCents ?? 0 },
    { label: "Cleaning fee", cents: booking?.cleaningFeeCents ?? 0 },
    { label: "Captain fee", cents: booking?.captainFeeCents ?? 0 },
    { label: "Card processing fee", cents: booking?.serviceFeeCents ?? 0 },
  ].filter((r) => r.cents > 0);

  return (
    <div
      className={`mx-auto w-full max-w-2xl px-4 py-12 transition-all duration-700 sm:px-6 sm:py-16 ${
        showAnimation ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* ── Statement header ── */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]">
        Kings of the Sea · Booking confirmed
      </p>
      <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-tight text-primary sm:text-5xl">
        See you on the water.
      </h1>
      <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base">
        {remainingCents > 0
          ? `Your deposit went through and your date is locked in. The remaining ${formatCentsAsCurrency(remainingCents)} is due before your trip — we'll send a payment link when it's time.`
          : "Your payment went through and your charter is locked in."}{" "}
        A confirmation email is on its way
        {booking?.customerName ? `, ${booking.customerName.split(" ")[0]}` : ""}.
      </p>

      {/* ── Boat photo ── */}
      {booking?.boatMainImage ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-light-main">
          <Image
            src={booking.boatMainImage}
            alt={booking.boatName || "Your charter"}
            fill
            sizes="(max-width: 672px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      ) : null}

      {/* ── Trip facts — flat hairline rows ── */}
      <div className="mt-8 divide-y divide-border/60 border-y border-border/60">
        {booking?.boatName ? (
          <FactRow
            label="Boat"
            value={
              <>
                {booking.boatName}
                {booking.boatCategory ? (
                  <span className="ml-1.5 text-xs font-normal text-slate-500">
                    {booking.boatCategory}
                  </span>
                ) : null}
              </>
            }
          />
        ) : null}
        {bookingDate ? (
          <FactRow
            label="Date & time"
            value={`${bookingDate}${duration ? ` · ${duration}h` : ""}`}
          />
        ) : null}
        {booking?.numberOfPassengers ? (
          <FactRow label="Guests" value={booking.numberOfPassengers} />
        ) : null}
        {booking?.id ? (
          <FactRow label="Booking ref" value={`#${booking.id.slice(0, 6).toUpperCase()}`} />
        ) : null}
        {priceRows.map((row) => (
          <FactRow key={row.label} label={row.label} value={formatCentsAsCurrency(row.cents)} />
        ))}
        {booking?.totalAmountCents ? (
          <FactRow label="Charter total" value={formatCentsAsCurrency(booking.totalAmountCents)} />
        ) : null}
        {paidNowCents > 0 ? (
          <div className="flex items-baseline justify-between gap-6 py-3">
            <span className="text-sm font-semibold text-primary">
              {remainingCents > 0 ? "Deposit paid today" : "Paid today"}
            </span>
            <span className="text-base font-bold text-success">{formatCentsAsCurrency(paidNowCents)}</span>
          </div>
        ) : null}
        {remainingCents > 0 ? (
          <div className="flex items-baseline justify-between gap-6 py-3">
            <span className="text-sm font-semibold text-primary">Remaining balance</span>
            <span className="text-base font-semibold text-primary">{formatCentsAsCurrency(remainingCents)}</span>
          </div>
        ) : null}
      </div>

      {/* ── What happens next ── */}
      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          What happens next
        </p>
        <ul className="mt-3 space-y-2 text-[15px] leading-7 text-slate-600">
          <li>Your confirmation email has the full trip details.</li>
          <li>We&apos;ll follow up before your trip with arrival instructions.</li>
          <li>
            Questions in the meantime? Call or text{" "}
            <a href="tel:+13055218877" className="font-medium text-primary">
              (305) 521-8877
            </a>
            .
          </li>
        </ul>
      </div>

      {/* ── Actions ── */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-11 rounded-full px-7">
          <Link href="/">Back to home</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-11 rounded-full border-0 bg-foreground/10 px-7 text-primary hover:bg-foreground/15 hover:text-primary"
        >
          <Link href="/boats/search">Browse the fleet</Link>
        </Button>
      </div>
    </div>
  );
}
