"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createDateTimeISO,
  getBoatDayBoundsUTC,
} from "@/shared/lib/utils/date-helpers";

interface BoatTimeSlot {
  /** "HH:mm" in the boat's local time */
  time: string;
  isAvailable: boolean;
}

interface ApiConflict {
  startTime: string;
  endTime: string;
}

// Selectable start times, in the boat's local time.
const FIRST_HOUR = 6;
const LAST_HOUR = 20; // last selectable start time
const INTERVAL_MIN = 30;

/**
 * Timezone-correct time slots for a given day.
 *
 * Every slot's start/end is computed as a real UTC instant in the boat's
 * timezone (via `createDateTimeISO`), then intersected against the day's
 * conflicts — which are also UTC. This means availability and the displayed
 * times are correct no matter where the viewer's browser is.
 */
export function useBoatTimeSlots({
  date,
  boat,
  durationHours,
}: {
  date: Date | null;
  boat: { id: string; timezone?: string | null };
  durationHours: number;
}) {
  const boatTimezone = boat.timezone ?? null;

  const dateKey = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`
    : "";

  const baseTimes = useMemo(() => {
    const times: string[] = [];
    for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour++) {
      for (let min = 0; min < 60; min += INTERVAL_MIN) {
        if (hour === LAST_HOUR && min > 0) break;
        times.push(`${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
    return times;
  }, []);

  // react-query handles caching (flipping between days is instant), request
  // dedupe, and race-safety — no manual active-flag effect needed.
  const conflictsQuery = useQuery({
    queryKey: ["boat-availability", boat.id, dateKey, boatTimezone],
    enabled: !!date && !!boat.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { startUTC, endUTC } = getBoatDayBoundsUTC(date as Date, {
        timezone: boatTimezone,
      });
      const res = await fetch(
        `/api/boats/${boat.id}/availability?startDate=${startUTC.toISOString()}&endDate=${endUTC.toISOString()}`
      );
      if (!res.ok) throw new Error("availability fetch failed");
      const data: { conflicts?: ApiConflict[] } = await res.json();
      return data.conflicts ?? [];
    },
  });

  const conflicts = useMemo(() => conflictsQuery.data ?? [], [conflictsQuery.data]);

  // Depend on the boat's primitives, not the object — a fresh `boat` object
  // per render would otherwise recompute every slot on every render.
  const slots = useMemo<BoatTimeSlot[]>(() => {
    if (!date) return [];
    const now = new Date();
    const parsedConflicts = conflicts.map((c) => ({
      start: new Date(c.startTime),
      end: new Date(c.endTime),
    }));

    return baseTimes.map((time) => {
      const startUTC = new Date(createDateTimeISO(date, time, { timezone: boatTimezone }));
      const endUTC = new Date(startUTC.getTime() + durationHours * 60 * 60 * 1000);
      const isPast = startUTC < now;
      const hasConflict = parsedConflicts.some(
        (c) => startUTC < c.end && endUTC > c.start
      );
      return { time, isAvailable: !isPast && !hasConflict };
    });
  }, [baseTimes, conflicts, date, boatTimezone, durationHours]);

  // isLoading = pending AND actually fetching, so a disabled query (no date
  // picked yet) never reads as loading.
  return { slots, loading: conflictsQuery.isLoading, error: conflictsQuery.isError };
}
