/**
 * Calendar events for the admin /admin/bookings calendar view.
 *
 * Honors the same filter set as the bookings table (status, payment, type,
 * admin, captain need, amount range, search) and uses the visible window
 * (`start` / `end` provided by FullCalendar) as the date filter.
 *
 * Auth: admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingStatusEnum, bookingTypeEnum } from "@/database/schema";
import { PAYMENT_DISPLAY_STATUSES } from "@/shared/lib/utils/payment-display";
import { format as formatDate } from "date-fns";
import type { BookingListItem } from "@/features/bookings/booking.types";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";

type EnumValue<T extends readonly string[]> = T[number];

function readEnum<T extends readonly string[]>(
  raw: string | null,
  values: T,
): EnumValue<T> | undefined {
  if (!raw) return undefined;
  return values.includes(raw as EnumValue<T>) ? (raw as EnumValue<T>) : undefined;
}

function readInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function readBool(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/** Booking status → swatch color. Tailwind tokens aren't available here (string output), so hex values. */
function colorForStatus(status: string): string {
  switch (status) {
    case "BOOKED":
      return "#10b981"; // emerald-500 — holds the slot
    case "PROPOSED":
      return "#f59e0b"; // amber-500 — tentative, awaiting the customer
    case "CANCELLED":
      return "#ef4444"; // red-500
    case "COMPLETED":
      return "#64748b"; // slate-500
    default:
      return "#6b7280"; // gray-500 (inquiries with a requested date)
  }
}

function buildSummary(b: BookingListItem): string {
  const customer = b.customerName || "Unknown";
  const boat = b.boatName || "—";
  return `${customer} · ${boat}`;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (admin.error !== undefined) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (!start || !end) {
      return NextResponse.json({ error: "start and end required" }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const result = await bookingService.getAllBookings({
      search: searchParams.get("search") || undefined,
      bookingStatus: readEnum(searchParams.get("bookingStatus"), bookingStatusEnum.enumValues),
      paymentStatus: readEnum(searchParams.get("paymentStatus"), PAYMENT_DISPLAY_STATUSES),
      bookingType: readEnum(searchParams.get("bookingType"), bookingTypeEnum.enumValues),
      assignedAdminId: searchParams.get("assignedAdminId") || undefined,
      bookingGroupId: searchParams.get("bookingGroupId") || undefined,
      needsCaptain: readBool(searchParams.get("needsCaptain")),
      minAmount: readInt(searchParams.get("minAmount")),
      maxAmount: readInt(searchParams.get("maxAmount")),
      // FullCalendar's visible window overrides any table-level date filter for this view.
      dateFrom: formatDate(startDate, "yyyy-MM-dd"),
      dateTo: formatDate(endDate, "yyyy-MM-dd"),
      // Lift the pagination cap so a month view shows everything in range.
      page: 1,
      limit: 500,
    });

    const events = result.bookings.map((b) => {
      const startISO = b.startDateTime instanceof Date ? b.startDateTime.toISOString() : new Date(b.startDateTime as unknown as string).toISOString();
      const endISO = b.endDateTime
        ? (b.endDateTime instanceof Date ? b.endDateTime.toISOString() : new Date(b.endDateTime as unknown as string).toISOString())
        : undefined;
      const color = colorForStatus(b.bookingStatus);
      return {
        id: `booking-${b.id}`,
        title: buildSummary(b),
        start: startISO,
        end: endISO,
        backgroundColor: color,
        borderColor: color,
        textColor: "#ffffff",
        extendedProps: {
          bookingId: b.id,
          customerName: b.customerName,
          customerEmail: b.customerEmail,
          customerPhone: b.customerPhone,
          boatName: b.boatName,
          captainFirstName: b.captainFirstName,
          captainLastName: b.captainLastName,
          bookingStatus: b.bookingStatus,
          paymentDisplayStatus: b.paymentDisplayStatus,
          totalAmountCents: b.totalAmountCents,
          serviceFeeCents: b.serviceFeeCents ?? null,
          currency: b.currency ?? "USD",
          opsGmvCents: b.opsGmvCents ?? null,
          opsExpenseCents: b.opsExpenseCents ?? null,
          needsCaptain: b.needsCaptain,
          numberOfPassengers: b.numberOfPassengers,
        },
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[admin/bookings/calendar-events]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  }
}
