"use client";

import { useSyncExternalStore } from "react";
import { format } from "date-fns";

const everyMinute = (onChange: () => void) => {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
};
const blankOnServer = () => "";

/**
 * Today in the viewer's own time zone, formatted with `pattern`. The server
 * can't know the zone, so its render gets "" and the browser fills it in; it
 * checks once a minute, so it turns over at midnight.
 */
export function useToday(pattern: string): string {
  return useSyncExternalStore(everyMinute, () => format(new Date(), pattern), blankOnServer);
}
