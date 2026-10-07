/**
 * Shared Badge Utilities
 *
 * This file contains reusable badge styling utilities for consistent
 * status badges across the entire application.
 */

import { cn } from "@/shared/lib/utils/general-utils";
import {
  PAYMENT_DISPLAY_LABELS,
  type PaymentDisplayStatus,
} from "@/shared/lib/utils/payment-display";

// Badge style configurations
const BADGE_STYLES = {
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  yellow: "bg-yellow-50 text-yellow-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  gray: "bg-gray-100 text-gray-700",
  amber: "bg-amber-50 text-amber-700",
  navy: "bg-slate-50 text-slate-700",
} as const;

type BadgeColor = keyof typeof BADGE_STYLES;

// Status color mappings
const STATUS_COLORS = {
  // User Status
  ACTIVE: "green",
  INACTIVE: "gray",
  SUSPENDED: "red",
  PENDING_VERIFICATION: "yellow",
  BANNED: "red",

  // Booking Status (PENDING is also a captain / crew / payment status)
  PENDING: "yellow",
  INQUIRY: "gray",
  PROPOSED: "yellow",
  BOOKED: "green",

  // Inquiry Stage
  NEEDS_CONTACT: "yellow",
  CONTACTED: "blue",
  CONVERTED: "green",

  // Booking / Blog / Misc
  DRAFT: "gray",
  PUBLISHED: "yellow",

  // Inquiry Outcome
  OPEN: "blue",
  WON: "green",
  LOST: "red",
  ABANDONED: "gray",

  // Inquiry Status (legacy)
  ARCHIVED: "gray",
  CANCELLED: "red",
  COMPLETED: "purple",

  // Booking Type
  INSTANT_BOOK: "green",
  REQUEST: "blue",
  EXTERNAL_BOOKING: "purple",

  // Raw payment transaction statuses (from Stripe)
  SUCCEEDED: "green",
  PROCESSING: "blue",
  FAILED: "red",
  CHARGEBACK: "red",

  // Computed payment display statuses (booking-level)
  UNPAID: "yellow",
  DEPOSIT_PAID: "amber",
  PAID: "green",

  // Boolean Status
  true: "green",
  false: "gray",

  // Special Status
  FEATURED: "amber",
} as const;

/**
 * Get badge style classes for a given status
 */
function getStatusBadgeClass(status: string | boolean | undefined | null): string {
  if (status === null || status === undefined) return BADGE_STYLES.gray;

  // Handle boolean values directly
  if (typeof status === "boolean") {
    return status ? BADGE_STYLES.green : BADGE_STYLES.gray;
  }

  const statusKey = String(status).toUpperCase();
  const color = (STATUS_COLORS as Record<string, BadgeColor>)[statusKey] || "gray";
  return BADGE_STYLES[color];
}

/**
 * Format status text for display (replace underscores with spaces, capitalize)
 */
function formatStatusText(status: string | boolean | undefined | null): string {
  if (status === null || status === undefined) return "Unknown";
  if (typeof status === "boolean") return status ? "Active" : "Inactive";

  const key = String(status).toUpperCase() as PaymentDisplayStatus;
  if (key in PAYMENT_DISPLAY_LABELS) return PAYMENT_DISPLAY_LABELS[key];

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Reusable StatusBadge component
 */
interface StatusBadgeProps {
  title?: string;
  status: string | boolean | undefined | null;
  className?: string;
}

export function StatusBadge({ title, status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        getStatusBadgeClass(status),
        className
      )}
      title={title}
    >
      {formatStatusText(status)}
    </span>
  );
}

