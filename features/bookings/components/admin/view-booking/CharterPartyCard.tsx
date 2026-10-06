import Link from "next/link";
import { Ship } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import type { BookingStatus } from "@/database/types";

export interface CharterPartyMember {
  id: string;
  boatName: string | null;
  bookingStatus: BookingStatus;
  startDateTime: Date | null;
  totalAmountCents: number | null;
  /** Party boats can sit in different zones — each renders in its own. */
  boatTimezone: string | null;
}

const STATUS_BADGE: Partial<Record<BookingStatus, string>> = {
  PROPOSED: "bg-warning-soft text-warning",
  BOOKED: "bg-success-soft text-success",
  CANCELLED: "bg-destructive-soft text-destructive",
  COMPLETED: "bg-muted text-muted-foreground",
};

function formatTripStart(d: Date | null, timezone: string | null): string {
  if (!d) return "—";
  return formatBoatLocal(d, timezone, "MMM d, yyyy · h:mm a zzz") || "—";
}

/**
 * The charter party: every boat sailing under this booking's group. One
 * proposal, one payment, several hulls — this card is how an admin opening
 * any single boat sees the rest of the fleet it sails with.
 */
export function CharterPartyCard({
  members,
  currentBookingId,
  groupName,
  basePath,
}: {
  members: CharterPartyMember[];
  currentBookingId: string;
  groupName: string | null;
  /** "/admin/bookings" or "/brokers/deals". */
  basePath: string;
}) {
  const partyTotalCents = members.reduce((sum, m) => sum + (m.totalAmountCents ?? 0), 0);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ship className="h-4.5 w-4.5 text-primary-strong" />
          Charter party
          <span className="text-sm font-normal text-muted-foreground">
            {groupName ? `${groupName} · ` : ""}
            {members.length} boats
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/50">
          {members.map((m) => {
            const isCurrent = m.id === currentBookingId;
            const row = (
              <div className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.boatName ?? "Boat TBD"}
                    {isCurrent ? (
                      <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        this booking
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatTripStart(m.startDateTime, m.boatTimezone)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    STATUS_BADGE[m.bookingStatus] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.bookingStatus}
                </span>
                <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums">
                  {m.totalAmountCents != null ? formatCentsAsCurrency(m.totalAmountCents) : "—"}
                </span>
              </div>
            );

            return isCurrent ? (
              <div key={m.id}>{row}</div>
            ) : (
              <Link
                key={m.id}
                href={`${basePath}/${m.id}`}
                className="block transition-colors hover:bg-primary-soft/40"
              >
                {row}
              </Link>
            );
          })}
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-border/50 pt-3">
          <span className="text-sm font-semibold text-foreground">Party total</span>
          <span className="text-base font-bold tabular-nums text-primary-strong">
            {formatCentsAsCurrency(partyTotalCents)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
