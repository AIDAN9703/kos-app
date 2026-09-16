import { cn } from "@/shared/lib/utils/general-utils";
import { TRIP_TONE_CLASSES, tripStatus } from "../../trip-presentation";
import type { TripSummary } from "../../profile.types";

export function TripStatusBadge({ trip, className }: { trip: TripSummary; className?: string }) {
  const { label, tone } = tripStatus(trip);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TRIP_TONE_CLASSES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
