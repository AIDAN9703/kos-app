import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { surface } from "@/features/profile/components/surface";
import {
  TRIP_TONE_CLASSES,
  guestsLabel,
  tripTimeRange,
} from "@/features/profile/trip-presentation";
import { charterStatus, payoutSummary } from "../owner-presentation";
import type { OwnerCharter } from "../owner.types";

interface CharterListProps {
  charters: OwnerCharter[];
  /** Show the date instead of the boat name (on a single boat's page). */
  hideBoat?: boolean;
  empty: string;
}

/** Charters on the owner's boats. No guest details, by design. */
export function CharterList({ charters, hideBoat = false, empty }: CharterListProps) {
  if (charters.length === 0) {
    return <p className={`px-6 py-8 text-center text-sm text-slate-500 ${surface}`}>{empty}</p>;
  }

  const now = new Date();
  return (
    <ul className={`divide-y divide-gray-100 ${surface}`}>
      {charters.map((c) => {
        const status = charterStatus(c, now);
        const payout = payoutSummary(c);
        return (
          <li key={c.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
            <div className="w-12 shrink-0 rounded-xl bg-slate-50 py-1.5 text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                {formatBoatLocal(c.startsAt, c.timezone, "MMM")}
              </p>
              <p className="text-lg leading-tight font-bold text-primary">
                {formatBoatLocal(c.startsAt, c.timezone, "d")}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-primary">
                {hideBoat ? formatBoatLocal(c.startsAt, c.timezone, "EEEE, MMMM d") : c.boatName}
              </p>
              <p className="truncate text-sm text-slate-500">
                {[tripTimeRange(c), guestsLabel(c.guests)].filter(Boolean).join(" · ")}
              </p>
            </div>

            <span
              className={cn(
                "hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex",
                TRIP_TONE_CLASSES[status.tone]
              )}
            >
              {status.label}
            </span>

            <div className="w-20 shrink-0 text-right">
              {payout.amount ? (
                <p className="font-semibold text-primary tabular-nums">{payout.amount}</p>
              ) : null}
              <p className="text-xs text-slate-500">{payout.note}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
