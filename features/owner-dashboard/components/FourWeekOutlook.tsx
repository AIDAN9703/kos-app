import Image from "next/image";
import { cn } from "@/shared/lib/utils/general-utils";
import { GlassPanel } from "@/shared/admin/components/glass";
import { TRIP_FALLBACK_IMAGE } from "@/features/profile/trip-presentation";
import type { BoatOutlook, OutlookDay } from "../owner-insights";

/**
 * Four weeks ahead, one row per live boat: gold days are booked, outlined
 * days are open Fridays to Sundays (the days that matter most), faint days
 * are open weekdays. The header counts the open weekend days.
 */
export function FourWeekOutlook({
  days,
  boats,
  openWeekendDays,
  className,
}: {
  days: OutlookDay[];
  boats: BoatOutlook[];
  openWeekendDays: number;
  className?: string;
}) {
  if (boats.length === 0) return null;
  return (
    <GlassPanel
      title="Next 4 weeks"
      className={className}
      aside={
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="size-2.5 rounded-sm bg-primary" /> Booked
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="size-2.5 rounded-sm ring-1 ring-foreground/40 ring-inset" /> Open
            Fri–Sun
          </span>
          <span className="rounded-full bg-glass-strong px-2.5 py-0.5 font-semibold text-foreground ring-1 ring-glass-border ring-inset">
            {openWeekendDays} open weekend {openWeekendDays === 1 ? "day" : "days"}
          </span>
        </span>
      }
    >
      <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:thin]">
        <table className="w-full min-w-[760px] border-separate border-spacing-x-[3px] border-spacing-y-1.5">
          <thead>
            <tr>
              <th className="w-44 text-left text-xs font-medium text-muted-foreground">
                <span className="sr-only">Boat</span>
              </th>
              {days.map((d) => (
                <th key={d.key} className="text-center font-normal">
                  <span className="block text-[10px] text-muted-foreground">{d.weekday}</span>
                  <span
                    className={cn(
                      "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-[11px] tabular-nums",
                      d.today
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground/80"
                    )}
                  >
                    {d.dayOfMonth}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boats.map((boat) => (
              <tr key={boat.boatId}>
                <th scope="row" className="pr-3 text-left font-normal">
                  <span className="flex items-center gap-2.5">
                    <span className="relative size-8 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={boat.image || TRIP_FALLBACK_IMAGE}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {boat.boatName}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {boat.openWeekendDays} open weekend{" "}
                        {boat.openWeekendDays === 1 ? "day" : "days"}
                      </span>
                    </span>
                  </span>
                </th>
                {days.map((d) => {
                  const booked = boat.booked.has(d.key);
                  return (
                    <td key={d.key} className="p-0">
                      <span
                        title={`${d.key}: ${booked ? "booked" : "open"}`}
                        className={cn(
                          "block h-8 rounded-md",
                          booked
                            ? "bg-primary shadow-[0_0_12px_-2px_var(--primary)]"
                            : d.weekend
                              ? "ring-1 ring-foreground/35 ring-inset"
                              : "bg-glass-inset"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
