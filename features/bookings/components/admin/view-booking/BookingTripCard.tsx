"use client";

import Link from "next/link";

import { GlassPanel } from "@/shared/admin/components/glass";
import { useBookingEditMode } from "@/features/bookings/components/admin/view-booking/BookingEditMode";
import {
  OpsCaptainAssignment,
  type CaptainAssignmentOption,
} from "@/features/bookings/components/admin/OpsCaptainAssignment";
import {
  OpsCrewAssignment,
  type CrewAssignmentMember,
  type CrewAssignmentOption,
} from "@/features/bookings/components/admin/OpsCrewAssignment";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { TripEditor, type TripEditorPricing } from "./TripEditor";

export interface BookingTripDetailsSnapshot {
  /** Trip fields are null while the deal is an INQUIRY without a set trip. */
  numberOfPassengers: number | null;
  needsCaptain: boolean | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  /** ISO string */
  startDateTime: string | null;
  endDateTime: string | null;
  boatTimezone: string | null;
  boatId: string | null;
  boatName: string | null;
  selectedBoat: {
    id: string;
    name: string;
    mainImage: string | null;
    capacity: number;
    locationLabel: string | null;
    cleaningFee: number | null;
    depositAmount: number | null;
    crewRequired: boolean | null;
  } | null;
}

interface BookingTripCardProps {
  bookingId: string;
  /** Boats in this booking's charter party (1 = solo booking). */
  partySize?: number;
  trip: BookingTripDetailsSnapshot;
  captainUserId: string | null;
  captainFirstName: string | null;
  captainLastName: string | null;
  captainEmail: string | null;
  captainOptions: CaptainAssignmentOption[];
  bookingCrew: CrewAssignmentMember[];
  crewOptions: CrewAssignmentOption[];
  /** Null when there is no price to edit. */
  pricing: TripEditorPricing | null;
  /** Proposed or booked — more boats can join the party. */
  canAddBoat: boolean;
}

function formatTripDateTime(iso: string | null, timezone: string | null): string {
  if (!iso) return "—";
  // Date AND time in the boat's zone — formatting only the time left the date
  // one day off for trips near midnight.
  return formatBoatLocal(iso, timezone, "MMM d, yyyy · h:mm a zzz") || "—";
}

/**
 * The trip, most important first: which boat and who runs it on the top
 * row (captain/crew assignment is live in both modes — it's a control, not a
 * field), then when, then the rest. In the page's edit mode the card becomes
 * the whole trip form — trip, pricing, add-ons, more boats — so everything an
 * admin changes sits on the left and Finances stays a read-only breakdown.
 */
export function BookingTripCard({
  bookingId,
  partySize = 1,
  trip,
  captainUserId,
  captainFirstName,
  captainLastName,
  captainEmail,
  captainOptions,
  bookingCrew,
  crewOptions,
  pricing,
  canAddBoat,
}: BookingTripCardProps) {
  const { editing } = useBookingEditMode();

  return (
    <GlassPanel title="Trip details" className="gap-4">
      <div className="space-y-5">
        {/* Row 1 — the boat and who runs it. Captain/crew are live controls
            in both modes; the boat itself is picked in the form while editing. */}
        <dl className={`grid gap-x-8 gap-y-5 ${editing ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {editing ? null : (
            <Fact label="Boat">
              {trip.boatId ? (
                <Link
                  href={`/admin/boats/${trip.boatId}`}
                  className="text-sm font-medium text-primary-strong hover:underline"
                >
                  {trip.boatName ?? "View boat"}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </Fact>
          )}
          <Fact label="Captain">
            <OpsCaptainAssignment
              bookingId={bookingId}
              captainUserId={captainUserId}
              captainFirstName={captainFirstName}
              captainLastName={captainLastName}
              captainEmail={captainEmail}
              captainOptions={captainOptions}
            />
          </Fact>
          <Fact label="Crew">
            <OpsCrewAssignment
              bookingId={bookingId}
              assignedCrew={bookingCrew}
              crewOptions={crewOptions}
            />
          </Fact>
        </dl>

        {editing ? (
          <TripEditor
            bookingId={bookingId}
            trip={trip}
            pricing={pricing}
            partySize={partySize}
            canAddBoat={canAddBoat}
          />
        ) : (
          <>
            {/* Row 2 — when. */}
            <dl className="grid gap-x-8 gap-y-5 border-t border-glass-border pt-5 sm:grid-cols-2">
              <Fact label="From">
                <span className="text-sm font-medium tabular-nums">
                  {formatTripDateTime(trip.startDateTime, trip.boatTimezone)}
                </span>
              </Fact>
              <Fact label="To">
                <span className="text-sm font-medium tabular-nums">
                  {formatTripDateTime(trip.endDateTime, trip.boatTimezone)}
                </span>
              </Fact>
            </dl>
            {/* Row 3 — the rest. */}
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-glass-border pt-5 sm:grid-cols-4">
              <Fact label="Passengers">
                <span className="text-sm font-medium tabular-nums">{trip.numberOfPassengers ?? "—"}</span>
              </Fact>
              <Fact label="Captain needed">
                <span className="text-sm font-medium">{trip.needsCaptain ? "Yes" : "No"}</span>
              </Fact>
              <Fact label="Pickup">
                <span className="text-sm font-medium">
                  {trip.pickupLocation || <span className="text-muted-foreground/50">—</span>}
                </span>
              </Fact>
              <Fact label="Drop-off">
                <span className="text-sm font-medium">
                  {trip.dropoffLocation || <span className="text-muted-foreground/50">—</span>}
                </span>
              </Fact>
            </dl>
          </>
        )}
      </div>
    </GlassPanel>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
