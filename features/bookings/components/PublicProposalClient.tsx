"use client";

import Image from "next/image";
import { format } from "date-fns";
import {
  ProposalTripDetails,
  ProposalBoatsList,
  ProposalAddOns,
  ProposalPricingCard,
  ProposalActions,
} from "./proposal";
import type { ProposalData } from "@/features/bookings/lib/proposal.types";

const DEFAULT_IMAGE = "/images/herooption22.jpg";

export default function PublicProposalClient({
  data,
  publicToken,
}: {
  data: ProposalData;
  publicToken: string;
}) {
  const heroImage = data.bookings[0]?.boatMainImage ?? DEFAULT_IMAGE;
  const hasAddOns = data.bookings.some((b) => (b.addOns ?? []).length > 0);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-8">
          {/* Hero — rounded image with the proposal title over it */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl sm:aspect-[21/9]">
            <Image
              src={heroImage}
              alt={data.bookings[0]?.boatName ?? "Charter"}
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 640px) 100vw, 1152px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-end">
              <div className="w-full px-5 pb-6 sm:px-7 sm:pb-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                  Your charter proposal
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white drop-shadow-md sm:text-3xl md:text-4xl">
                  {data.customerName}&rsquo;s Experience
                </h1>
                {data.updatedAt ? (
                  <p className="mt-1.5 text-xs font-medium text-white/70">
                    Updated {format(new Date(data.updatedAt), "MMMM d, yyyy")} — this link
                    always shows the latest version
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
            {/* Left column — trip details & what's included */}
            <div className="space-y-10">
              <section>
                <h2 className="text-lg font-semibold text-primary">Trip Details</h2>
                <div className="mt-4">
                  <ProposalTripDetails data={data} />
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-primary">What&apos;s Included</h2>
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Boats
                  </p>
                  <div className="mt-1 divide-y divide-border/60">
                    <ProposalBoatsList bookings={data.bookings} />
                  </div>
                </div>
                {hasAddOns && (
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Add-ons
                    </p>
                    <div className="mt-1 divide-y divide-border/60">
                      <ProposalAddOns bookings={data.bookings} />
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right column — payment summary & actions */}
            <div>
              <section>
                <h2 className="text-lg font-semibold text-primary">Payment Summary</h2>
                <div className="mt-4">
                  <ProposalPricingCard
                    bookings={data.bookings}
                    depositAmountCents={data.depositAmountCents}
                    totalPaidCents={data.totalPaidCents}
                  />
                </div>
                <div className="mt-8">
                  <ProposalActions
                    publicToken={publicToken}
                    allowPayment={data.allowPayment}
                    serviceFeeWaived={data.bookings.some((b) => b.serviceFeeWaived)}
                    isAccepted={!!data.acceptedAt}
                    totalPaidCents={data.totalPaidCents}
                    depositAmountCents={data.depositAmountCents}
                    totalAmountCents={data.totalAmountCents}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
