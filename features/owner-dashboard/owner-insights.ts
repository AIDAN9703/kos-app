import { addDays, differenceInCalendarDays, format } from "date-fns";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { charterDayKeys } from "./owner-analytics";
import type { OwnerBoat, OwnerCharter } from "./owner.types";

/**
 * What the owner overview says beyond the numbers: what needs the owner,
 * and how the next few weeks look. Pure, like owner-analytics.
 */

const INSURANCE_WARNING_DAYS = 45;
const MIN_PHOTOS = 5;

export interface AttentionItem {
  id: string;
  /** action: the owner has something to do; warning: time-sensitive; info: FYI. */
  tone: "action" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
  cta: string;
}

export function attentionItems(boats: OwnerBoat[], now: Date = new Date()): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const boat of boats) {
    const selfListed = boat.managedBy === "OWNER";
    if (selfListed && boat.listingStatus === "CHANGES_REQUESTED") {
      items.push({
        id: `${boat.id}:changes`,
        tone: "action",
        title: `KOS asked for changes on ${boat.name}`,
        detail: boat.reviewNote ?? "See the note on your listing.",
        href: `/list-your-boat/${boat.id}`,
        cta: "Review",
      });
    } else if (selfListed && boat.listingStatus === "DRAFT") {
      items.push({
        id: `${boat.id}:draft`,
        tone: "action",
        title: `Finish listing ${boat.name}`,
        detail: "It's saved as a draft. Pick up where you left off.",
        href: `/list-your-boat/${boat.id}`,
        cta: "Continue",
      });
    } else if (selfListed && boat.listingStatus === "IN_REVIEW") {
      items.push({
        id: `${boat.id}:review`,
        tone: "info",
        title: `${boat.name} is with the KOS team`,
        detail: "We're reviewing the listing and will be in touch.",
        href: `/list-your-boat/${boat.id}/review`,
        cta: "View",
      });
    } else if (selfListed && !boat.active) {
      items.push({
        id: `${boat.id}:hidden`,
        tone: "info",
        title: `${boat.name} is hidden`,
        detail: "Guests can't book it until you show the listing again.",
        href: `/owner/boats/${boat.id}`,
        cta: "Manage",
      });
    }

    if (selfListed && boat.listingStatus === "APPROVED" && boat.photoCount < MIN_PHOTOS) {
      items.push({
        id: `${boat.id}:photos`,
        tone: "action",
        title: `Add photos to ${boat.name}`,
        detail: `It has ${boat.photoCount}. Listings with ${MIN_PHOTOS} or more book far more often.`,
        href: `/list-your-boat/${boat.id}/photos`,
        cta: "Add photos",
      });
    }

    if (boat.insuranceExpiry) {
      const days = differenceInCalendarDays(boat.insuranceExpiry, now);
      if (days <= INSURANCE_WARNING_DAYS) {
        items.push({
          id: `${boat.id}:insurance`,
          tone: "warning",
          title:
            days < 0
              ? `Insurance on ${boat.name} has expired`
              : `Insurance on ${boat.name} expires ${days === 0 ? "today" : `in ${days} days`}`,
          detail: selfListed
            ? "Update the policy so the boat stays bookable."
            : "Send the renewal to the KOS team so the boat stays bookable.",
          href: selfListed ? `/list-your-boat/${boat.id}/documents` : "/contact",
          cta: selfListed ? "Update" : "Contact KOS",
        });
      }
    }
  }
  const order = { warning: 0, action: 1, info: 2 } as const;
  return items.sort((a, b) => order[a.tone] - order[b.tone]);
}

export interface OutlookDay {
  key: string;
  /** "M" "T"… */
  weekday: string;
  dayOfMonth: string;
  weekend: boolean;
  today: boolean;
}

export interface BoatOutlook {
  boatId: string;
  boatName: string;
  image: string | null;
  booked: Set<string>;
  openWeekendDays: number;
}

const OUTLOOK_DAYS = 28;

/**
 * The next four weeks, day by day, per live boat: which days are booked and
 * how many weekend days are still open (the days owners most want filled).
 * Days are the boat's local dates.
 */
export function buildOutlook(
  boats: OwnerBoat[],
  charters: OwnerCharter[],
  now: Date = new Date()
): { days: OutlookDay[]; boats: BoatOutlook[]; openWeekendDays: number } {
  const zone = boats.find((b) => b.timezone)?.timezone ?? "America/New_York";
  const todayKey = formatBoatLocal(now, zone, "yyyy-MM-dd");
  const start = new Date(`${todayKey}T12:00:00Z`);
  const days: OutlookDay[] = Array.from({ length: OUTLOOK_DAYS }, (_, i) => {
    const d = addDays(start, i);
    const dow = d.getUTCDay();
    return {
      key: d.toISOString().slice(0, 10),
      weekday: format(d, "EEEEE"),
      dayOfMonth: String(d.getUTCDate()),
      weekend: dow === 0 || dow === 5 || dow === 6,
      today: i === 0,
    };
  });

  const live = boats.filter((b) => b.active);
  const rows = live.map((boat) => {
    const booked = new Set(
      charters
        .filter((c) => c.boatId === boat.id && c.status === "BOOKED")
        .flatMap((c) => charterDayKeys(c))
    );
    const openWeekendDays = days.filter((d) => d.weekend && !booked.has(d.key)).length;
    return { boatId: boat.id, boatName: boat.name, image: boat.mainImage, booked, openWeekendDays };
  });
  return { days, boats: rows, openWeekendDays: rows.reduce((s, r) => s + r.openWeekendDays, 0) };
}

/** "Today", "Tomorrow", "In 5 days", "In 3 weeks". */
export function countdown(startsAt: Date, now: Date = new Date()): string {
  const days = differenceInCalendarDays(startsAt, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}
