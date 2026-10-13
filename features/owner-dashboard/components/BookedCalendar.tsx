import { addDays, addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { charterDayKeys } from "../owner-analytics";
import type { OwnerCharter } from "../owner.types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface BookedCalendarProps {
  charters: OwnerCharter[];
  /** The boat's IANA zone — "today" and every booked day are read in it. */
  timezone: string | null;
  months?: number;
}

/** A read-only month view of the days this boat is booked, starting this month. */
export function BookedCalendar({ charters, timezone, months = 2 }: BookedCalendarProps) {
  const todayKey = formatBoatLocal(new Date(), timezone, "yyyy-MM-dd");
  const booked = new Set(charters.filter((c) => c.status === "BOOKED").flatMap(charterDayKeys));
  // Month math runs on a noon-UTC anchor of the boat-local "today", so no offset shifts a day.
  const anchor = new Date(`${todayKey}T12:00:00Z`);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {Array.from({ length: months }, (_, i) => {
        const first = startOfMonth(addMonths(anchor, i));
        const days = Array.from({ length: endOfMonth(first).getDate() }, (_, d) =>
          addDays(first, d)
        );
        return (
          <div key={i}>
            <p className="font-semibold text-foreground">{format(first, "MMMM yyyy")}</p>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm">
              {WEEKDAYS.map((w, idx) => (
                <span key={idx} className="pb-1 text-xs font-medium text-muted-foreground">
                  {w}
                </span>
              ))}
              {Array.from({ length: getDay(first) }, (_, idx) => (
                <span key={`pad-${idx}`} />
              ))}
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const isBooked = booked.has(key);
                return (
                  <span
                    key={key}
                    title={isBooked ? "Booked" : undefined}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg tabular-nums",
                      isBooked
                        ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_12px_-3px_var(--primary)]"
                        : key < todayKey
                          ? "text-muted-foreground/50"
                          : "bg-glass-inset text-foreground/85",
                      key === todayKey && !isBooked && "font-semibold ring-1 ring-primary"
                    )}
                  >
                    {day.getDate()}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
