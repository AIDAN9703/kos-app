import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { guestsLabel, tripTimeRange } from "@/features/profile/trip-presentation";
import { charterStatus, payoutSummary } from "../owner-presentation";
import type { OwnerCharter } from "../owner.types";

interface CharterListProps {
  charters: OwnerCharter[];
  /** Show the date instead of the boat name (on a single boat's page). */
  hideBoat?: boolean;
  empty: string;
  /** Managers don't see what a charter earns. */
  showMoney: boolean;
}

/** Status chips in the admin's ring style: colored text on a soft fill. */
const TONE: Record<string, string> = {
  success: "bg-success-soft text-success ring-success/25",
  muted: "bg-glass-inset text-muted-foreground ring-glass-border",
  destructive: "bg-destructive-soft text-destructive ring-destructive/25",
};

/** Charters on the owner's boats, as rows inside a glass panel. No guest details, by design. */
export function CharterList({ charters, hideBoat = false, empty, showMoney }: CharterListProps) {
  if (charters.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  const now = new Date();
  return (
    <ul className="divide-y divide-glass-border">
      {charters.map((c) => {
        const status = charterStatus(c, now);
        const payout = payoutSummary(c);
        return (
          <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-12 shrink-0 rounded-2xl bg-glass-inset py-1.5 text-center ring-1 ring-glass-border ring-inset">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {formatBoatLocal(c.startsAt, c.timezone, "MMM")}
              </p>
              <p className="text-lg leading-tight font-semibold text-foreground tabular-nums">
                {formatBoatLocal(c.startsAt, c.timezone, "d")}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {hideBoat ? formatBoatLocal(c.startsAt, c.timezone, "EEEE, MMMM d") : c.boatName}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {[
                  hideBoat ? null : formatBoatLocal(c.startsAt, c.timezone, "EEE"),
                  tripTimeRange(c),
                  guestsLabel(c.guests),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <span
              className={cn(
                "hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex",
                TONE[status.tone] ?? TONE.muted
              )}
            >
              {status.label}
            </span>

            {showMoney ? (
              <div className="w-24 shrink-0 text-right">
                {payout.amount ? (
                  <p className="font-semibold text-foreground tabular-nums">{payout.amount}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">{payout.note}</p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
