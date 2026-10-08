import type { ActionItem, ActionKind } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { elapsed } from "./format";

/** How an action item reads, wherever it's listed (the queue, the bell). */

export const KIND_LABELS: Record<ActionKind, string> = {
  conflict: "Calendar conflict",
  "change-request": "Change request",
  stripe: "Stripe event failed",
  captain: "No captain",
  balance: "Balance due",
  "past-due": "Past due",
  lead: "New lead",
  "proposal-unpaid": "Unpaid proposal",
  "proposal-unsent": "Unsent proposal",
  "calendar-sync": "Calendar sync",
};

/** Severity light: urgent pulses red, soon is amber, the rest quiet. */
export function Led({ severity }: { severity: ActionItem["severity"] }) {
  if (severity === 3) {
    return (
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-destructive opacity-60" />
        <span className="relative size-2 rounded-full bg-destructive" />
      </span>
    );
  }
  return <span aria-hidden className={cn("size-2 rounded-full", severity === 2 ? "bg-warning" : "bg-muted-foreground/40")} />;
}

/** The trip's start in boat time, or how long it's been waiting. */
export function when(item: ActionItem): string {
  if (item.tripStart) return formatBoatLocal(item.tripStart, item.timezone, "EEE MMM d, h:mm a");
  if (item.since) return `${elapsed(item.since)} ago`;
  return "";
}
