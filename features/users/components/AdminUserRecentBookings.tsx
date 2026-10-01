"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/lib/utils/badge-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { formatDateTime } from "@/shared/lib/utils/general-utils";
import type { BookingListItemShared } from "@/shared/lib/types/booking-shared.types";

interface UserRecentBookingsProps {
  userId: string;
  bookings?: BookingListItemShared[];
}

export function AdminUserRecentBookings({ userId, bookings }: UserRecentBookingsProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-4 w-4" />
              Recent Bookings
            </CardTitle>
            <CardDescription>
              {bookings && bookings.length > 0
                ? `${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`
                : "No bookings found"}
            </CardDescription>
          </div>
          {bookings && bookings.length > 0 && (
            <Link
              href={`/admin/bookings?userId=${userId}`}
              className="text-sm font-semibold text-primary-strong hover:text-primary-strong/80 transition-colors"
            >
              View All →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!bookings || bookings.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">This user hasn&apos;t made any bookings yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/admin/bookings/${booking.id}`}
                className="block py-3 px-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary-strong transition-colors">
                        {formatDateTime(booking.startDateTime)}
                      </p>
                      <StatusBadge status={booking.bookingStatus} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {booking.bookingType.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold text-foreground">
                        {booking.totalAmountCents
                          ? formatCentsAsCurrency(booking.totalAmountCents)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
