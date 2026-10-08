import {
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  Globe,
  MessageSquareText,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Visual identity for each deal KIND (booking.bookingType): the color-coded
 * "what is this row" chip on the bookings board and the booking page header,
 * and the light wash across the kind's board rows.
 *
 * Colours are categorical (sky/teal/emerald/…) on purpose — kind is an
 * identity, not a semantic state. Lifecycle state uses the semantic
 * success/warning/destructive tokens via deal-status.ts instead.
 */
interface DealKindPresentation {
  /** Canonical short label. */
  label: string;
  /** Icon shown in the chip. */
  Icon: LucideIcon;
  /** Chip classes: tint, text and ring, like the role chips. */
  badge: string;
  /** The board row's light wash of the kind's color, and its hover. */
  row: string;
  /**
   * Kinds sharing a group filter together. "INQUIRY" covers boat + general
   * inquiries (whether a boat/date exists is visible on the row itself);
   * every other kind is its own group.
   */
  group: string;
}

const FALLBACK: DealKindPresentation = {
  label: "Booking",
  Icon: ClipboardList,
  badge: "bg-slate-400/15 text-slate-300 ring-slate-400/30",
  row: "bg-slate-400/10 hover:bg-slate-400/16",
  group: "OTHER",
};

/**
 * Everything that starts as "someone wants to charter a boat" presents as one
 * kind: Inquiry. That covers boat/general inquiries, admin-logged leads,
 * admin-built bookings, and legacy website requests — the row's boat/date
 * cell, source line, and pipeline stage carry the differences. Only kinds
 * with genuinely different mechanics keep their own identity: term charters
 * (multi-day product), marketplace ingests, and instant books.
 */
const INQUIRY: DealKindPresentation = {
  label: "Inquiry",
  Icon: MessageSquareText,
  badge: "bg-slate-400/15 text-slate-300 ring-slate-400/30",
  row: "bg-slate-400/10 hover:bg-slate-400/16",
  group: "INQUIRY",
};

const DEAL_KIND_PRESENTATION: Record<string, DealKindPresentation> = {
  BOAT_REQUEST: INQUIRY,
  GENERAL_QUOTE: INQUIRY,
  MANUAL: INQUIRY,
  EXTERNAL_BOOKING: INQUIRY,
  REQUEST: INQUIRY,
  TERM_CHARTER: {
    label: "Term charter",
    Icon: CalendarRange,
    badge: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
    row: "bg-sky-400/10 hover:bg-sky-400/16",
    group: "TERM_CHARTER",
  },
  MARKETPLACE: {
    label: "Marketplace",
    Icon: Globe,
    badge: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
    row: "bg-teal-400/10 hover:bg-teal-400/16",
    group: "MARKETPLACE",
  },
  INSTANT_BOOK: {
    label: "Instant book",
    Icon: Zap,
    badge: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
    row: "bg-emerald-400/10 hover:bg-emerald-400/16",
    group: "INSTANT_BOOK",
  },
};

function getDealKind(bookingType: string): DealKindPresentation {
  return DEAL_KIND_PRESENTATION[bookingType] ?? FALLBACK;
}

/** Statuses where a deal has been priced past the inquiry stage. */
export const PRICED_STATUSES = new Set(["PROPOSED", "BOOKED", "COMPLETED"]);

/**
 * Once an inquiry-family deal is priced, it IS a booking — and it changes
 * color. Booking-system convention: gray = incoming/unqualified (inquiry),
 * brand gold = the live deal being worked, green = paid (instant book).
 */
const BOOKING_STAGE: DealKindPresentation = {
  label: "Booking",
  Icon: CalendarCheck,
  badge: "bg-primary/15 text-primary-strong ring-primary/30",
  row: "bg-primary/10 hover:bg-primary/16",
  group: "INQUIRY",
};

/**
 * Stage-aware display kind: inquiry-family deals present as "Inquiry" while
 * they're still leads and as "Booking" once priced (including cancelled deals
 * that had real pricing — a dead lead stays "Inquiry", a dead booking stays
 * "Booking"). Distinct kinds (term charter / marketplace / instant book)
 * keep their identity at every stage.
 */
export function getDisplayKind(booking: {
  bookingType: string;
  bookingStatus: string;
  totalAmountCents?: number | null;
}): DealKindPresentation {
  const kind = getDealKind(booking.bookingType);
  if (kind.group !== "INQUIRY") return kind;
  const priced =
    PRICED_STATUSES.has(booking.bookingStatus) ||
    (booking.bookingStatus === "CANCELLED" && (booking.totalAmountCents ?? 0) > 0);
  return priced ? BOOKING_STAGE : kind;
}

/** The deal's kind as a colored chip, like the role chips on the users table. */
export function DealKindChip({ booking }: { booking: Parameters<typeof getDisplayKind>[0] }) {
  const kind = getDisplayKind(booking);
  const Icon = kind.Icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${kind.badge}`}
    >
      <Icon className="size-3" aria-hidden />
      {kind.label}
    </span>
  );
}

/** The kinds a calendar shows most, for its legend. */
export const KIND_LEGEND: { label: string; badge: string }[] = [
  { label: BOOKING_STAGE.label, badge: BOOKING_STAGE.badge },
  { label: INQUIRY.label, badge: INQUIRY.badge },
  { label: DEAL_KIND_PRESENTATION.INSTANT_BOOK.label, badge: DEAL_KIND_PRESENTATION.INSTANT_BOOK.badge },
];
