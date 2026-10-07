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

// Five tones, all theme colors: the same badge reads correctly on the light
// site and the dark admin.
const BADGE_STYLES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
} as const;

type BadgeColor = keyof typeof BADGE_STYLES;

// Status color mappings
const STATUS_COLORS = {
  // User Status
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
  PENDING_VERIFICATION: "warning",
  BANNED: "danger",

  // Booking Status (PENDING is also a captain / crew / payment status)
  PENDING: "warning",
  INQUIRY: "neutral",
  PROPOSED: "warning",
  BOOKED: "success",

  // Inquiry Stage
  NEEDS_CONTACT: "warning",
  CONTACTED: "info",
  CONVERTED: "success",

  // Booking / Blog / Misc
  DRAFT: "neutral",
  PUBLISHED: "warning",

  // Inquiry Outcome
  OPEN: "info",
  WON: "success",
  LOST: "danger",
  ABANDONED: "neutral",

  // Inquiry Status (legacy)
  ARCHIVED: "neutral",
  CANCELLED: "danger",
  COMPLETED: "info",

  // Booking Type
  INSTANT_BOOK: "success",
  REQUEST: "info",
  EXTERNAL_BOOKING: "info",

  // Raw payment transaction statuses (from Stripe)
  SUCCEEDED: "success",
  PROCESSING: "info",
  FAILED: "danger",
  CHARGEBACK: "danger",

  // Computed payment display statuses (booking-level)
  UNPAID: "warning",
  DEPOSIT_PAID: "warning",
  PAID: "success",

  // Boolean Status
  true: "success",
  false: "neutral",

  // Special Status
  FEATURED: "warning",
} as const;

/**
 * Get badge style classes for a given status
 */
function getStatusBadgeClass(status: string | boolean | undefined | null): string {
  if (status === null || status === undefined) return BADGE_STYLES.neutral;

  // Handle boolean values directly
  if (typeof status === "boolean") {
    return status ? BADGE_STYLES.success : BADGE_STYLES.neutral;
  }

  const statusKey = String(status).toUpperCase();
  const color = (STATUS_COLORS as Record<string, BadgeColor>)[statusKey] || "neutral";
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

