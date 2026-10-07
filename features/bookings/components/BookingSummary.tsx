"use client";

import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import { Calendar, Clock, MapPin, Users, Zap } from "lucide-react";

import type { SafeBoatData } from "@/features/bookings/booking.types";
import type { BoatTier } from "@/features/boats/boat.types";
import { formatDate, formatTime12Hour } from "@/shared/lib/utils/general-utils";
import { parseDateTimeInBoatTimezone } from "@/shared/lib/utils/date-helpers";

interface BookingSummaryProps {
  boat: SafeBoatData;
  selectedTier: BoatTier | null;
  bookingData: {
    startDateTime: string | null;
    numberOfPassengers: number;
  };
}

function DetailChip({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {children}
    </span>
  );
}

export default function BookingSummary({
  boat,
  bookingData,
  selectedTier,
}: BookingSummaryProps) {
  const formatBookingDateTime = () => {
    if (!bookingData.startDateTime) return { date: "TBD", time: "TBD" };

    const { date: boatDate, time: boatTime } = parseDateTimeInBoatTimezone(
      bookingData.startDateTime,
      boat,
    );

    if (!boatDate || !boatTime) return { date: "TBD", time: "TBD" };

    return {
      date: formatDate(boatDate),
      time: formatTime12Hour(boatTime),
    };
  };

  const { date, time } = formatBookingDateTime();
  const partySize = `${bookingData.numberOfPassengers} ${
    bookingData.numberOfPassengers === 1 ? "guest" : "guests"
  }`;

  return (
    <section className="space-y-5">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gray-100">
        {boat.mainImage && (
          <Image
            src={boat.mainImage}
            alt={boat.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
        )}
        {boat.instantBook && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            <Zap className="h-3 w-3 fill-current" />
            Instant book
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              {boat.name}
            </h2>
            {boat.locationLabel && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{boat.locationLabel}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <DetailChip icon={Calendar}>{date}</DetailChip>
          <DetailChip icon={Clock}>{time}</DetailChip>
          <DetailChip icon={Users}>{partySize}</DetailChip>
          {selectedTier && (
            <DetailChip icon={Clock}>
              {selectedTier.hours}h · {selectedTier.name || "Charter"}
            </DetailChip>
          )}
        </div>
      </div>
    </section>
  );
}
