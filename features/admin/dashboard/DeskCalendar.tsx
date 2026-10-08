"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { CalendarBooking } from "@/features/bookings/booking.types";
import { CalendarGrid } from "@/features/bookings/components/admin/CalendarGrid";
import { KIND_LEGEND } from "@/features/bookings/deal-presentation";
import { buttonVariants } from "@/shared/components/ui/button";
import { useToday } from "@/shared/lib/hooks/use-today";
import { cn } from "@/shared/lib/utils/general-utils";
import { Panel } from "./Panel";

/**
 * This week and next as a calendar: every deal on its day, in the bookings
 * table's colors, with past days faded. Proposals the customer can't pay
 * (they clash with the boat's calendar) are outlined red.
 */
export function DeskCalendar({
  days,
  deals,
  conflictIds,
}: {
  days: string[];
  deals: CalendarBooking[];
  conflictIds: string[];
}) {
  const today = useToday("yyyy-MM-dd");
  const clashes = useMemo(() => new Set(conflictIds), [conflictIds]);

  return (
    <Panel
      title="This week and next"
      actions={
        <>
          <div className="hidden items-center gap-3 lg:flex">
            {KIND_LEGEND.map((k) => (
              <span key={k.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-4 rounded-sm ring-1 ring-inset", k.badge)} />
                {k.label}
              </span>
            ))}
          </div>
          <Link
            href="/admin/bookings?view=calendar"
            className={cn(buttonVariants({ variant: "glass", size: "sm" }), "h-8 px-3.5 text-xs")}
          >
            Open calendar
          </Link>
        </>
      }
    >
      <CalendarGrid
        days={days}
        deals={deals}
        conflictIds={clashes}
        dim={(day) => Boolean(today) && day < today}
      />
    </Panel>
  );
}
