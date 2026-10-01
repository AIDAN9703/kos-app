"use client";

import Image from "next/image";
import { Info } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { POINTS_PER_DOLLAR, REDEMPTION, type LoyaltySummary } from "../../loyalty";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * KOS Points on a navy band — balance, progress to the next block of charter
 * credit, and an info button that opens the program explainer.
 */
export function LoyaltyCard({ loyalty }: { loyalty: LoyaltySummary }) {
  const { points, pendingPoints, creditAvailableDollars, pointsToNextCredit, progressPercent } =
    loyalty;

  return (
    <section
      aria-labelledby="loyalty-heading"
      className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-[0_14px_36px_-18px_rgba(15,23,42,0.55)] sm:p-7"
    >
      {/* Crest watermark — off-centre, cropped, barely there. */}
      <Image
        src="/icons/transparent-white-newer-logo.png"
        alt=""
        width={260}
        height={260}
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-10 w-56 opacity-[0.07] sm:w-64"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p
            id="loyalty-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-glow"
          >
            KOS Points
          </p>
          <p className="mt-2 text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
            {fmt(points)}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {pendingPoints > 0
              ? `+${fmt(pendingPoints)} pending from booked trips`
              : "Earned on completed charters"}
          </p>
        </div>
        <PointsInfoDialog loyalty={loyalty} />
      </div>

      <div className="relative mt-6">
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-700"
            style={{ width: `${Math.max(3, progressPercent)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-white/80">
            {fmt(pointsToNextCredit)} points to your next ${REDEMPTION.creditDollars} credit
          </span>
          {creditAvailableDollars > 0 ? (
            <span className="font-semibold text-gold-glow">
              ${fmt(creditAvailableDollars)} credit available
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PointsInfoDialog({ loyalty }: { loyalty: LoyaltySummary }) {
  const steps = [
    {
      title: "Earn",
      body: `${POINTS_PER_DOLLAR} point for every $1 you pay on a charter. Points land once the trip is complete — booked trips show as pending.`,
    },
    {
      title: "Redeem",
      body: `Every ${fmt(REDEMPTION.points)} points is worth $${REDEMPTION.creditDollars} off a future charter. Tell your concierge when you book and they'll apply it.`,
    },
    {
      title: "Keep sailing",
      body: "Your points never expire while your account is active.",
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
        >
          <Info className="h-3.5 w-3.5" />
          How it works
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] gap-6 rounded-2xl border-gray-200 bg-white p-6 text-slate-900 sm:max-w-md sm:rounded-2xl sm:p-7">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-primary">
            How KOS Points work
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6 text-slate-600">
            Every charter you take with us earns points toward credit on your next one.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-soft text-sm font-bold text-gold-deep">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-primary">{step.title}</p>
                <p className="mt-0.5 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex items-baseline justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <span className="whitespace-nowrap text-slate-600">Your balance</span>
          <span className="font-semibold tabular-nums text-primary">
            {fmt(loyalty.points)} points
            {loyalty.creditAvailableDollars > 0
              ? ` · $${fmt(loyalty.creditAvailableDollars)} credit`
              : ""}
          </span>
        </div>

        <DialogFooter className="gap-3 sm:items-center sm:justify-between sm:space-x-0">
          <p className="text-xs leading-5 text-slate-500">
            Adjusted for refunds and cancellations. Credit has no cash value.
          </p>
          <DialogClose asChild>
            <Button className="shrink-0 rounded-full px-6">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
