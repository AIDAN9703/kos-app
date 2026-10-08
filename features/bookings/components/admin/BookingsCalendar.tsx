"use client";

import { useTransition } from "react";
import { useQueryStates } from "nuqs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarBooking } from "@/features/bookings/booking.types";
import { CalendarGrid } from "@/features/bookings/components/admin/CalendarGrid";
import { monthGridDays, monthTitle, shiftMonth } from "@/features/bookings/lib/calendar-month";
import { bookingSearchParams } from "@/features/bookings/searchParams";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils/general-utils";

/**
 * The bookings calendar: a month of days, each deal a chip in its kind's
 * color (the board's colors), in its boat's local time. The server loads the
 * month on screen (?month=, with the board's filters); the arrows change the
 * month in the URL, and the grid dims while the next one loads.
 */
export function BookingsCalendar({ month, deals }: { month: string; deals: CalendarBooking[] }) {
  const [loading, startTransition] = useTransition();
  const [, setFilters] = useQueryStates(bookingSearchParams, { shallow: false, startTransition });

  return (
    <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-glass-border px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{monthTitle(month)}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            className="size-9 p-0"
            aria-label="Previous month"
            onClick={() => setFilters({ month: shiftMonth(month, -1) })}
          >
            <ChevronLeft />
          </Button>
          <Button variant="glass" size="sm" className="h-9 px-4" onClick={() => setFilters({ month: null })}>
            Today
          </Button>
          <Button
            variant="glass"
            size="sm"
            className="size-9 p-0"
            aria-label="Next month"
            onClick={() => setFilters({ month: shiftMonth(month, 1) })}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <CalendarGrid
        days={monthGridDays(month)}
        deals={deals}
        dim={(day) => !day.startsWith(month)}
        fill
        bodyClassName={cn(loading && "opacity-50")}
      />
    </div>
  );
}
