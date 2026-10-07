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
 * Visual identity for each deal KIND (booking.bookingType) — the loud,
 * color-coded "what is this row" signal that leads the bookings board and
 * the type command strip. One source of truth so the row's left rail, its
 * type badge, and the top strip all share a colour.
 *
 * Colours are categorical (sky/violet/emerald/…) on purpose — kind is an
 * identity, not a semantic state. Lifecycle state uses the semantic
 * success/warning/destructive tokens via deal-status.ts instead.
 */
interface DealKindPresentation {
  /** Canonical short label. */
  label: string;
  /** Icon shown in the type badge. */
  Icon: LucideIcon;
  /** Left accent rail colour (solid). */
  rail: string;
  /** Icon-square background + foreground. */
  iconWrap: string;
  /** Pill/badge classes (bg tint + text). */
  badge: string;
  /** Subtle row hover tint matching the kind. */
  rowHover: string;
  /** Whole-row background wash — the kind's color across the full row. */
  rowBg: string;
  /** Solid dot (used in the command strip). */
  dot: string;
  /** True for pre-sale lead kinds (no boat/pricing guaranteed). */
  isLead: boolean;
  /**
   * Filter/strip grouping — kinds sharing a group render as ONE strip segment
   * and filter together. "INQUIRY" covers boat + general inquiries (whether a
   * boat/date exists is visible on the row itself); every other kind is its
   * own group.
   */
  group: string;
}

const FALLBACK: DealKindPresentation = {
  label: "Booking",
  Icon: ClipboardList,
  rail: "bg-slate-400",
  iconWrap: "bg-slate-500/10 text-slate-300",
  badge: "bg-slate-500/10 text-slate-300",
  rowHover: "hover:bg-slate-400/20",
  rowBg: "bg-slate-400/14",
  dot: "bg-slate-400",
  isLead: false,
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
  rail: "bg-slate-400",
  iconWrap: "bg-slate-500/10 text-slate-300",
  badge: "bg-slate-500/10 text-slate-300",
  rowHover: "hover:bg-slate-400/20",
  rowBg: "bg-slate-400/14",
  dot: "bg-slate-400",
  isLead: true,
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
    rail: "bg-sky-500",
    iconWrap: "bg-sky-500/10 text-sky-300",
    badge: "bg-sky-500/10 text-sky-300",
    rowHover: "hover:bg-sky-500/18",
    rowBg: "bg-sky-500/12",
    dot: "bg-sky-500",
    isLead: true,
    group: "TERM_CHARTER",
  },
  MARKETPLACE: {
    label: "Marketplace",
    Icon: Globe,
    rail: "bg-teal-500",
    iconWrap: "bg-teal-500/10 text-teal-300",
    badge: "bg-teal-500/10 text-teal-300",
    rowHover: "hover:bg-teal-500/18",
    rowBg: "bg-teal-500/12",
    dot: "bg-teal-500",
    isLead: true,
    group: "MARKETPLACE",
  },
  INSTANT_BOOK: {
    label: "Instant book",
    Icon: Zap,
    rail: "bg-emerald-500",
    iconWrap: "bg-emerald-500/10 text-emerald-300",
    badge: "bg-emerald-500/10 text-emerald-300",
    rowHover: "hover:bg-emerald-500/18",
    rowBg: "bg-emerald-500/12",
    dot: "bg-emerald-500",
    isLead: false,
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
  rail: "bg-primary",
  iconWrap: "bg-primary-soft text-primary-strong",
  badge: "bg-primary-soft text-primary-strong",
  rowHover: "hover:bg-primary/20",
  rowBg: "bg-primary/14",
  dot: "bg-primary",
  isLead: false,
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

/**
 * The strip's segments, in display order — DISPLAY kinds, not entry types.
 * The server buckets counts with the exact same stage-aware rule (see
 * getBookingTypeCounts), so each segment's number, its filter, and the row
 * labels always agree: an inquiry that gets priced moves from the Inquiry
 * segment to the Booking segment.
 */
export const DISPLAY_KINDS: { key: string; presentation: DealKindPresentation }[] = [
  { key: "INQUIRY", presentation: INQUIRY },
  { key: "BOOKING", presentation: BOOKING_STAGE },
  { key: "TERM_CHARTER", presentation: DEAL_KIND_PRESENTATION.TERM_CHARTER },
  { key: "MARKETPLACE", presentation: DEAL_KIND_PRESENTATION.MARKETPLACE },
  { key: "INSTANT_BOOK", presentation: DEAL_KIND_PRESENTATION.INSTANT_BOOK },
];
