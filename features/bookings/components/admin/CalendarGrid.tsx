"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { CalendarBooking } from "@/features/bookings/booking.types";
import { useDealsBasePath } from "@/features/bookings/components/admin/deal-links";
import { getDisplayKind } from "@/features/bookings/deal-presentation";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useToday } from "@/shared/lib/hooks/use-today";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { cn } from "@/shared/lib/utils/general-utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Chips a day shows before "+N more". */
const VISIBLE = 3;

/** The deal's day and start time on its boat's own clock. */
function boatDay(deal: CalendarBooking) {
  return formatBoatLocal(deal.startDateTime, deal.boatTimezone, "yyyy-MM-dd");
}
function boatTime(deal: CalendarBooking) {
  return formatBoatLocal(deal.startDateTime, deal.boatTimezone, "h:mmaaaaa").replace(":00", "");
}

/**
 * One deal in a day: start time and boat, then the customer, in its kind's
 * color (the board's colors). Opens the deal. A proposal that clashes with
 * the boat's calendar (the customer can't pay) is outlined red.
 */
function DealChip({ deal, href, clash }: { deal: CalendarBooking; href: string; clash: boolean }) {
  return (
    <Link
      href={href}
      title={
        clash
          ? `${deal.customerName ?? "Deal"}: overlaps the boat's calendar, so the customer can't pay.`
          : [deal.customerName, deal.boatName].filter(Boolean).join(" · ")
      }
      className={cn(
        "block min-w-0 rounded-md px-1.5 py-1 leading-tight ring-1 ring-inset transition-[filter] hover:brightness-125",
        clash ? "bg-destructive/15 text-destructive ring-destructive" : getDisplayKind(deal).badge,
        deal.bookingStatus === "CANCELLED" && "line-through opacity-60"
      )}
    >
      <span className="flex min-w-0 items-baseline gap-1.5 text-[10px]">
        <span className="shrink-0 tabular-nums opacity-80">{boatTime(deal)}</span>
        {deal.boatName ? <span className="truncate opacity-70">{deal.boatName}</span> : null}
      </span>
      <span className="block truncate text-[11px] font-medium">{deal.customerName || "Unnamed"}</span>
    </Link>
  );
}

/**
 * Days as a calendar: weekday headings, then a cell per day with its deals
 * as chips (boat-local time), "+N more" for a busy day, and a hover + to add
 * a booking on it. The bookings calendar (a month) and the dashboard (two
 * weeks) both draw with it.
 */
export function CalendarGrid({
  days,
  deals,
  dim,
  conflictIds,
  fill = false,
  bodyClassName,
}: {
  /** yyyy-MM-dd, whole weeks, Sunday first. */
  days: string[];
  deals: CalendarBooking[];
  /** Days to fade (outside the month, or already past). */
  dim?: (day: string) => boolean;
  /** Proposals the customer can't pay, outlined red. */
  conflictIds?: ReadonlySet<string>;
  /** Stretch the rows to fill the height (scrolling when it runs out). */
  fill?: boolean;
  bodyClassName?: string;
}) {
  const basePath = useDealsBasePath();
  const today = useToday("yyyy-MM-dd");

  const byDay = new Map<string, CalendarBooking[]>();
  for (const deal of deals) {
    const key = boatDay(deal);
    byDay.set(key, [...(byDay.get(key) ?? []), deal]);
  }
  const chip = (deal: CalendarBooking) => (
    <DealChip key={deal.id} deal={deal} href={`${basePath}/${deal.id}`} clash={conflictIds?.has(deal.id) ?? false} />
  );

  return (
    <div className={cn("flex min-h-0 flex-col", fill && "flex-1")}>
      <div className="grid shrink-0 grid-cols-7 border-b border-glass-border">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="px-3 py-2 text-xs font-medium text-muted-foreground">
            {weekday}
          </div>
        ))}
      </div>

      <div className={cn("min-h-0 overflow-y-auto transition-opacity", fill && "flex-1", bodyClassName)}>
        <div
          className={cn(
            "grid grid-cols-7",
            fill ? "h-full auto-rows-[minmax(7.5rem,1fr)]" : "auto-rows-[minmax(7rem,auto)]"
          )}
        >
          {days.map((day, index) => {
            const list = byDay.get(day) ?? [];
            const faded = dim?.(day) ?? false;
            return (
              <div
                key={day}
                className={cn(
                  "group flex min-w-0 flex-col gap-1 border-glass-border p-1.5",
                  index % 7 !== 6 && "border-r",
                  index < days.length - 7 && "border-b",
                  faded && "bg-background/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/admin/bookings/create?date=${day}`}
                    aria-label={`Add a booking on ${day}`}
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-glass-strong hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Plus className="size-3.5" />
                  </Link>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                      day === today
                        ? "bg-primary font-semibold text-primary-foreground"
                        : faded
                          ? "text-muted-foreground/50"
                          : "text-foreground"
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                </div>

                {/* Phones: a dot per deal. Wider: chips, then "+N more". */}
                {list.length > 0 ? (
                  <div className="flex flex-wrap gap-1 px-1 sm:hidden">
                    {list.map((deal) => (
                      <span
                        key={deal.id}
                        aria-hidden
                        className={cn("size-1.5 rounded-full", getDisplayKind(deal).badge, "bg-current")}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                  {list.slice(0, VISIBLE).map(chip)}
                  {list.length > VISIBLE ? (
                    <Popover>
                      <PopoverTrigger className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-glass-inset hover:text-foreground">
                        +{list.length - VISIBLE} more
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-64 space-y-1 rounded-xl p-2">
                        <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
                          {formatBoatLocal(list[0].startDateTime, list[0].boatTimezone, "EEEE, MMMM d")}
                        </p>
                        {list.map(chip)}
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
