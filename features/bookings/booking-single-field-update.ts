/**
 * Single-field admin booking updates: validation + row patch + audit snapshot.
 * Keeps booking.service thin — apply logic lives here in one place.
 */

import * as z from "zod";
import { toDateOrNull } from "@/shared/lib/utils/date-helpers";
import type { BookingDetails } from "@/features/bookings/booking.types";
import { UserFacingError } from "@/shared/lib/errors";

export const bookingSingleFieldUpdateSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.literal("customerName"),
    value: z.string().min(1, "Customer name is required"),
  }),
  z.object({
    field: z.literal("customerEmail"),
    value: z.string().email("Invalid email"),
  }),
  z.object({
    field: z.literal("customerPhone"),
    value: z.string().min(1, "Phone is required"),
  }),
  z.object({
    field: z.literal("numberOfPassengers"),
    value: z.number().int().min(1, "At least one passenger"),
  }),
  z.object({
    field: z.literal("needsCaptain"),
    value: z.boolean(),
  }),
  z.object({
    field: z.literal("pickupLocation"),
    value: z.union([z.string(), z.null()]),
  }),
  z.object({
    field: z.literal("dropoffLocation"),
    value: z.union([z.string(), z.null()]),
  }),
  // The trip window travels as ONE value — start and end can never be
  // saved separately (a split save briefly stores end-before-start and the
  // DB's booking_time_range_valid CHECK rightly rejects it).
  z.object({
    field: z.literal("tripWindow"),
    value: z.object({
      startDateTime: z.string().datetime({ offset: true }),
      endDateTime: z.union([z.string().datetime({ offset: true }), z.null()]),
    }),
  }),
  z.object({
    field: z.literal("boatId"),
    value: z.string().uuid("Invalid boat"),
  }),
]);

export type BookingSingleFieldUpdate = z.infer<typeof bookingSingleFieldUpdateSchema>;

type BookingSingleEditableField = BookingSingleFieldUpdate["field"];

/** Drizzle `.set()` payload for `booking` table columns only (no updatedAt). */
export function bookingRowPatchFromSingleFieldUpdate(
  update: BookingSingleFieldUpdate
): Record<string, unknown> {
  if (update.field === "boatId") {
    throw new Error("boatId is handled in BookingService.applyBoatIdChange");
  }
  switch (update.field) {
    case "customerName":
      return { customerName: update.value };
    case "customerEmail":
      return { customerEmail: update.value };
    case "customerPhone":
      return { customerPhone: update.value.trim() };
    case "numberOfPassengers":
      return { numberOfPassengers: update.value };
    case "needsCaptain":
      return { needsCaptain: update.value };
    case "pickupLocation": {
      const v =
        typeof update.value === "string" ? update.value.trim() || null : update.value;
      return { pickupLocation: v };
    }
    case "dropoffLocation": {
      const v =
        typeof update.value === "string" ? update.value.trim() || null : update.value;
      return { dropoffLocation: v };
    }
    case "tripWindow": {
      const start = toDateOrNull(update.value.startDateTime);
      if (!start) throw new UserFacingError("Invalid start date/time");
      const end =
        update.value.endDateTime === null ? null : toDateOrNull(update.value.endDateTime);
      if (end && end.getTime() <= start.getTime()) {
        throw new UserFacingError("End time must be after the start time.");
      }
      return { startDateTime: start, endDateTime: end };
    }
  }
}

export function auditSnapshotForBookingField(
  field: BookingSingleEditableField,
  booking: BookingDetails
): unknown {
  switch (field) {
    case "customerName":
      return booking.customerName;
    case "customerEmail":
      return booking.customerEmail;
    case "customerPhone":
      return booking.customerPhone;
    case "numberOfPassengers":
      return booking.numberOfPassengers;
    case "needsCaptain":
      return booking.needsCaptain ?? false;
    case "pickupLocation":
      return booking.pickupLocation;
    case "dropoffLocation":
      return booking.dropoffLocation;
    case "tripWindow":
      return {
        startDateTime:
          booking.startDateTime == null
            ? null
            : booking.startDateTime instanceof Date
              ? booking.startDateTime.toISOString()
              : String(booking.startDateTime),
        endDateTime:
          booking.endDateTime == null
            ? null
            : booking.endDateTime instanceof Date
              ? booking.endDateTime.toISOString()
              : String(booking.endDateTime),
      };
    case "boatId":
      return {
        boatId: booking.boatId,
        boatName: booking.boatName ?? null,
      };
  }
}
