import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/shared/lib/utils/general-utils";
import { guestsLabel, tripDate, tripTimeRange, TRIP_FALLBACK_IMAGE } from "../../trip-presentation";
import type { CaptainSummary } from "../../profile.types";
import { Section } from "../Section";
import { StatStrip } from "./StatStrip";

const STATUS_COPY: Record<
  CaptainSummary["profile"]["status"],
  { label: string; className: string; note?: string }
> = {
  ACTIVE: { label: "Active", className: "bg-success-soft text-success" },
  PENDING: {
    label: "Under review",
    className: "bg-warning-soft text-warning",
    note: "The team is verifying your details. You'll be assignable once that's done.",
  },
  INACTIVE: { label: "Inactive", className: "bg-muted text-muted-foreground" },
  ON_LEAVE: { label: "On leave", className: "bg-muted text-muted-foreground" },
  SUSPENDED: { label: "Suspended", className: "bg-destructive-soft text-destructive" },
};

/** A captain's standing with KOS and the booked trips they're assigned to. */
export function CaptainDashboard({ summary }: { summary: CaptainSummary }) {
  const { profile, upcoming, completedCount } = summary;
  const status = STATUS_COPY[profile.status];
  const completed = Math.max(completedCount, profile.totalTripsCompleted ?? 0);

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status.className)}
          >
            {status.label}
          </span>
          {profile.uscgLicensed ? (
            <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-deep">
              USCG licensed{profile.licenseType ? ` · ${profile.licenseType}` : ""}
            </span>
          ) : null}
          {profile.licenseExpiry ? (
            <span className="text-sm text-slate-500">
              License expires {format(profile.licenseExpiry, "MMM d, yyyy")}
            </span>
          ) : null}
        </div>
        {status.note ? <p className="text-[15px] leading-7 text-slate-600">{status.note}</p> : null}
      </div>

      <StatStrip
        stats={[
          { label: "Upcoming trips", value: upcoming.length },
          { label: "Trips completed", value: completed },
          { label: "Years experience", value: profile.yearsExperience ?? "—" },
        ]}
      />

      <Section id="assignments" title="Your upcoming trips">
        {upcoming.length === 0 ? (
          <p className="text-[15px] leading-7 text-slate-600">
            No trips assigned yet. When the team puts you on a charter it appears here with the
            departure time and pickup.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {upcoming.map((trip) => (
              <li key={trip.id} className="flex items-center gap-4 py-4">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={trip.boatImage || TRIP_FALLBACK_IMAGE}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-primary">{trip.boatName}</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {tripDate(trip)}
                    {tripTimeRange(trip) ? ` · ${tripTimeRange(trip)}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {guestsLabel(trip.guests)}
                    {trip.pickupLocation ? ` · ${trip.pickupLocation}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-sm leading-6 text-slate-500">
        Need to update your license or availability?{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          Contact the team
        </Link>
        .
      </p>
    </div>
  );
}
