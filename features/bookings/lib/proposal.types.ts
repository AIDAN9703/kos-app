import type { ServiceFee } from "@/shared/lib/utils/pricing-utils";

/**
 * Types for the public proposal page.
 * Used when customers open the SMS/link to view and accept their charter proposal.
 */

interface ProposalAddOn {
  name: string;
  description?: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface ProposalBooking {
  id: string;
  boatId: string;
  boatName: string;
  boatMainImage: string | null;
  /** This boat's IANA zone — trip times always render boat-local. */
  timezone: string | null;
  /** Per-boat trip window — shown when it differs from the lead booking's. */
  startDateTime: Date | null;
  endDateTime: Date | null;
  /** Charter base price only (cents) */
  basePriceCents: number;
  /** Captain fee (cents) */
  captainFeeCents: number;
  /** Cleaning fee (cents) */
  cleaningFeeCents: number;
  /** Card processing fee on the full total (cents) */
  serviceFeeCents: number;
  /** The fee this boat was priced with (rate + fixed). */
  serviceFee: ServiceFee;
  /** Card fee waived — the customer is settling off-card. */
  serviceFeeWaived: boolean;
  /** Total for this booking (cents) */
  totalCents: number;
  /** Deposit the admin set for this boat, before the card fee. */
  depositCents: number | null;
  addOns: ProposalAddOn[] | null;
}

export interface ProposalData {
  /** Latest admin edit across the party — the page's freshness stamp. */
  updatedAt: Date | null;
  id: string;
  customerName: string;
  startDateTime: Date;
  endDateTime: Date | null;
  numberOfPassengers: number;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  /** Lead boat's IANA zone — Trip Details renders boat-local, not viewer-local. */
  timezone: string | null;
  totalPaidCents: number;
  totalAmountCents: number;
  bookings: ProposalBooking[];
  /** What the guest can pay from this page right now. */
  payment: ProposalPaymentOptions;
}

/** Card payment choices on the proposal page, already priced with the card fee. */
export interface ProposalPaymentOptions {
  /** Settled off-card — no card payment is offered. */
  offCard: boolean;
  /** Everything still owed (the full total until something is paid). */
  remainingCents: number;
  /** Deposit-first option; only before anything is paid and when set. */
  deposit: { baseCents: number; feeCents: number; amountCents: number } | null;
  /** Card fee label, e.g. "3.99% + $0.99". */
  feeLabel: string | null;
}
