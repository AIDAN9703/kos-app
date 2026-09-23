/**
 * Booking Service Layer
 * Single source of truth for all booking database operations
 *
 * ARCHITECTURE:
 * - Uses transactions for multi-table operations
 * - Delegates to specialized services (pricing, status, notes, payments)
 * - All monetary values are in CENTS
 *
 * RELATED SERVICES:
 * - BookingPricingService - manages booking_pricing table
 * - BookingStatusService - manages status transitions and history
 * - BookingNotesService - manages admin notes
 * - PaymentService - manages payments (in features/payments)
 */

import { db } from "@/database/db";
import {
  bookings,
  boats,
  users,
  bookingPricing,
  bookingStatusHistory,
  bookingEvents,
  bookingAdminNotes,
  bookingGroups,
  payments,
  bookingOps,
  boatPricingTiers,
} from "@/database/schema";
import {
  and,
  count,
  eq,
  ne,
  desc,
  or,
  ilike,
  isNull,
  isNotNull,
  sql,
  gte,
  lte,
  aliasedTable,
  inArray,
} from "drizzle-orm";

import {
  type BookingFilterInput,
  type CreateBookingsInput,
  INQUIRY_GROUP_TYPES,
} from "@/features/bookings/booking.validation";
import {
  type BookingSingleFieldUpdate,
  auditSnapshotForBookingField,
  bookingRowPatchFromSingleFieldUpdate,
} from "@/features/bookings/booking-single-field-update";
import {
  type PaginatedBookingsResponse,
  type BookingListItem,
  type BookingDetails,
  type BookingWithRelations,
  type BookingAddOn,
} from "@/features/bookings/booking.types";
import { type Booking, type BookingSource, type BookingType } from "@/database/types";
import {
  calculateBookingPriceCents,
  calculateBookingPriceFromDollars,
} from "@/shared/lib/utils/pricing-utils";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";
import { calculateEndDateTime } from "@/shared/lib/utils/date-helpers";
import { computePaymentDisplayStatus } from "@/shared/lib/utils/payment-display";
import { effectiveTotalCents } from "@/features/bookings/lib/booking-money";
import { resolveAdminListPagination } from "@/shared/admin/list-pagination";
import { bookingGroupService } from "@/features/booking-groups/booking-group.service";
import { bookingPricingService } from "@/features/bookings/services/booking-pricing.service";
import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import { fetchBoatAndTier, fetchBoatsAndTiersBulk } from "@/features/bookings/booking-helpers";
import { getAppSettings } from "@/features/app-settings/app-settings.service";
import {
  availabilityService,
  isOverlapConstraintError,
  SlotUnavailableError,
} from "@/features/availability/services/availability.service";

/**
 * Stage rule shared by the list filter and the type-count strip: an
 * inquiry-family row is "priced past inquiry" (displays as BOOKING) once its
 * status moved beyond the lead stage — or it was cancelled with real pricing
 * attached (a dead booking, not a dead lead). SQL twin of getDisplayKind in
 * deal-presentation.tsx; requires booking_pricing to be joined.
 */
function pricedPastInquirySql() {
  return sql`(${bookings.bookingStatus} IN ('PROPOSED', 'BOOKED', 'COMPLETED')
    OR (${bookings.bookingStatus} = 'CANCELLED' AND COALESCE(${bookingPricing.totalAmountCents}, 0) > 0))`;
}

// ============================================================================
// BOOKING SERVICE CLASS
// ============================================================================

/**
 * Availability gate with a message an admin can act on: WHICH boat and WHY,
 * not just "slot unavailable". Wraps assertSlotAvailable (bookings that block
 * the calendar, owner blocks, external calendar events).
 */
async function assertBoatWindowFree(
  boatId: string,
  boatName: string,
  start: Date,
  end: Date,
  excludeBookingId?: string
): Promise<void> {
  try {
    await availabilityService.assertSlotAvailable(boatId, start, end, excludeBookingId);
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      const why = error.conflicts
        .map((c) => c.reason)
        .filter(Boolean)
        .join("; ");
      throw new Error(
        `${boatName} isn't available for that window${why ? ` (${why})` : ""}. Pick another time or boat.`
      );
    }
    throw error;
  }
}

export class BookingService {
  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  /**
   * Create multiple bookings in a group - unified flow with per-booking customer/dates
   */
  async createBookings(
    input: CreateBookingsInput,
    assignedAdminId?: string | null
  ): Promise<{ bookingIds: string[]; publicToken: string | null; groupId: string | null }> {
    const now = new Date();
    const boatIds = [...new Set(input.bookings.map((b) => b.boatId))];
    const tierIds = input.bookings.map((b) => b.pricingTierId).filter((id): id is string => !!id);
    const { boatsById, tiersById } = await fetchBoatsAndTiersBulk(boatIds, tierIds);

    // Resolve every boat's window and refuse the WHOLE create if any slot is
    // already sold (BOOKED, owner blocks, external calendars). A
    // proposal doesn't block the calendar itself, so this is the only gate
    // between "admin proposes a sold slot" and "customer finds out at Accept".
    // Runs before any write: a mid-party failure would otherwise leave the
    // earlier boats (and the group) created.
    const windows: { startDateTime: Date; endDateTime: Date }[] = [];
    for (const b of input.bookings) {
      const boat = boatsById.get(b.boatId);
      const tier = b.pricingTierId ? tiersById.get(b.pricingTierId) : null;
      if (!boat) throw new Error(`Boat not found: ${b.boatId}`);
      if (b.pricingTierId && !tier) throw new Error(`Pricing tier not found: ${b.pricingTierId}`);
      const startDateTime = new Date(b.startDateTime);
      const endDateTime = b.endDateTime
        ? new Date(b.endDateTime)
        : tier
          ? calculateEndDateTime(startDateTime, tier.hours)
          : null;
      if (!endDateTime) throw new Error("End date & time is required for custom pricing");
      await assertBoatWindowFree(
        boat.id,
        boat.name,
        startDateTime,
        endDateTime,
        input.dealId ?? undefined
      );
      windows.push({ startDateTime, endDateTime });
    }

    let groupId: string | null = null;
    if (input.bookings.length > 1 || input.groupName) {
      const group = await bookingGroupService.create({
        name: input.groupName ?? `Booking Group ${now.toLocaleDateString()}`,
        notes: null,
        createdById: assignedAdminId ?? null,
      });
      groupId = group.id;
    }

    const publicToken = crypto.randomUUID();
    const bookingIds: string[] = [];
    let leadBookingType: BookingType | null = null;

    for (let i = 0; i < input.bookings.length; i++) {
      const b = input.bookings[i];
      const boat = boatsById.get(b.boatId);
      const tier = b.pricingTierId ? tiersById.get(b.pricingTierId) : null;

      if (!boat) throw new Error(`Boat not found: ${b.boatId}`);
      if (b.pricingTierId && !tier) throw new Error(`Pricing tier not found: ${b.pricingTierId}`);

      const basePrice = tier ? (b.basePrice ?? tier.price) : b.basePrice;
      if (basePrice == null || basePrice < 0)
        throw new Error("Base price is required and must be positive");

      const { startDateTime, endDateTime } = windows[i];

      const addOnsForThisBooking = b.addOns ?? [];
      const addOnsTotalDollars = addOnsForThisBooking.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const addOnsCents = dollarsToCents(addOnsTotalDollars);
      const basePriceCents = dollarsToCents(basePrice);

      const depositDollars =
        b.depositAmount != null && b.depositAmount >= 0
          ? b.depositAmount
          : (boat.depositAmount ?? 0);
      const depositCents = dollarsToCents(depositDollars);

      const addOnsPayload = addOnsForThisBooking.map((item) => ({
        name: item.name,
        description: item.description ?? null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        total: item.unitPrice * item.quantity,
      }));

      const tokenForThisBooking = i === 0 ? publicToken : null;
      const publishNow = input.publishNow ?? false;

      // One-table flow: pricing an INQUIRY deal UPGRADES that same row to a
      // PROPOSED — its id, entry type/source, and history stay intact.
      // Extra group sections (and creates without a deal) insert new rows.
      const upgradeDealId = i === 0 ? (input.dealId ?? null) : null;

      const dealFields = {
        userId: b.userId ?? null,
        boatOwnerId: boat.ownerId,
        boatId: boat.id,
        pricingTierId: tier?.id ?? null,
        bookingGroupId: groupId,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone ?? null,
        isMultiDay: false,
        startDateTime,
        endDateTime,
        numberOfPassengers: input.numberOfPassengers,
        pickupLocation: input.pickupLocation ?? null,
        dropoffLocation: input.dropoffLocation ?? null,
        adminNotes: input.adminNotes ?? null,
        addOns: addOnsPayload.length > 0 ? addOnsPayload : null,
        assignedAdminId: assignedAdminId ?? null,
        publicToken: tokenForThisBooking,
        allowPayment: input.allowPayment ?? false,
        publishedAt: publishNow ? now : null,
      };

      let bookingId: string;
      if (upgradeDealId) {
        // Compare-and-swap: only a row still at INQUIRY can be upgraded. Two
        // admins pricing the same lead → second one fails loudly here instead
        // of silently overwriting (no transactions on the neon-http driver).
        const [upgraded] = await db
          .update(bookings)
          .set({
            ...dealFields,
            // crewRequired boats force a captain; otherwise the customer's
            // stored preference survives the upgrade untouched.
            ...(boat.crewRequired ? { needsCaptain: true } : {}),
            updatedAt: now,
          })
          .where(
            and(eq(bookings.id, upgradeDealId), eq(bookings.bookingStatus, "INQUIRY"))
          )
          .returning({ id: bookings.id, bookingType: bookings.bookingType });
        if (!upgraded) {
          throw new Error(
            "This deal is no longer at the inquiry stage — it may have just been priced by another admin. Refresh to see the latest."
          );
        }
        await bookingStatusService.transitionStatus({
          bookingId: upgraded.id,
          newStatus: "PROPOSED",
          changedByUserId: assignedAdminId ?? null,
          reason: "Priced into a proposal",
        });
        leadBookingType = upgraded.bookingType;
        bookingId = upgraded.id;
      } else {
        const [created] = await db
          .insert(bookings)
          .values({
            // Party siblings inherit the lead's type; scratch creates stay
            // EXTERNAL_BOOKING.
            bookingType: leadBookingType ?? "EXTERNAL_BOOKING",
            bookingStatus: "PROPOSED",
            source: "ADMIN" as BookingSource,
            needsCaptain: boat.crewRequired,
            ...dealFields,
          })
          .returning({ id: bookings.id });
        await bookingStatusService.createInitialHistory(
          created.id,
          "PROPOSED",
          assignedAdminId,
          "Booking created"
        );
        bookingId = created.id;
      }

      await bookingPricingService.createPricingWithCalculation(bookingId, {
        basePriceCents,
        addOnsCents,
        cleaningFeeCents: dollarsToCents(boat.cleaningFee ?? 0),
        depositAmountCents: depositCents || undefined,
        currency: boat.currency ?? "USD",
      });

      bookingIds.push(bookingId);
    }

    // Only log "published" when the proposal actually went out — saving a
    // proposal without sending must not fabricate a timeline entry.
    if (publicToken && bookingIds.length > 0 && (input.publishNow ?? false)) {
      await bookingEventsService.logProposalPublished({
        bookingId: bookingIds[0],
        actorId: assignedAdminId ?? null,
        publicToken,
        groupId,
        allBookingIds: bookingIds,
      });
    }

    return {
      bookingIds,
      publicToken,
      groupId,
    };
  }

  /**
   * The proposal (one booking or a whole party) with boats and pricing, for the public page
   */
  async getProposalForPublicDisplay(token: string) {
    const rawRows = await this.getProposalBookingsByPublicToken(token);
    // A proposal is only presentable once it's priced against a real boat and
    // trip window — INQUIRY-phase rows can never leak to the public page.
    const proposalBookings = (rawRows ?? []).filter(
      (b): b is typeof b & { boatId: string; startDateTime: Date } =>
        b.boatId != null && b.startDateTime != null
    );
    if (proposalBookings.length === 0) return null;

    const boatIds = [...new Set(proposalBookings.map((b) => b.boatId))];
    const [boatsRows, pricingRows] = await Promise.all([
      db
        .select({
          id: boats.id,
          name: boats.name,
          mainImage: boats.mainImage,
          timezone: boats.timezone,
        })
        .from(boats)
        .where(inArray(boats.id, boatIds)),
      db
        .select()
        .from(bookingPricing)
        .where(
          inArray(
            bookingPricing.bookingId,
            proposalBookings.map((b) => b.id)
          )
        ),
    ]);
    const boatsById = new Map(boatsRows.map((b) => [b.id, b]));
    const pricingByBooking = new Map(pricingRows.map((p) => [p.bookingId, p]));

    const first = proposalBookings[0];
    // Fee-aware: a waived card fee drops out of what the customer owes.
    const totalCents = proposalBookings.reduce((sum, b) => {
      const pr = pricingByBooking.get(b.id);
      return pr ? sum + effectiveTotalCents({
        totalAmountCents: Number(pr.totalAmountCents),
        serviceFeeCents: pr.serviceFeeCents != null ? Number(pr.serviceFeeCents) : null,
        serviceFeeWaived: pr.serviceFeeWaived,
      }) : sum;
    }, 0);

    // Paid so far across the group — drives the public page's state
    // (unpaid → pay buttons, paid → confirmation).
    const [paidRow] = await db
      .select({
        paid: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.payableType, "BOOKING"),
          inArray(
            payments.payableId,
            proposalBookings.map((b) => b.id)
          ),
          eq(payments.status, "SUCCEEDED"),
          ne(payments.paymentType, "REFUND")
        )
      );

    return {
      id: first.id,
      customerName: first.customerName,
      customerEmail: first.customerEmail,
      // Freshness stamp for the public page — latest edit across the party.
      updatedAt: proposalBookings.reduce<Date | null>(
        (latest, b) =>
          b.updatedAt && (!latest || b.updatedAt > latest) ? b.updatedAt : latest,
        null
      ),
      startDateTime: first.startDateTime,
      endDateTime: first.endDateTime,
      numberOfPassengers: first.numberOfPassengers,
      pickupLocation: first.pickupLocation,
      dropoffLocation: first.dropoffLocation,
      // Charter times display in the BOAT's local time everywhere.
      timezone: (first.boatId ? boatsById.get(first.boatId)?.timezone : null) ?? null,
      allowPayment: first.allowPayment,
      acceptedAt: first.acceptedAt,
      totalPaidCents: Number(paidRow?.paid ?? 0),
      // Deposit to secure the date = SUM of per-boat deposits across the
      // party (checkout charges the same sum in deposit mode).
      depositAmountCents: (() => {
        const sum = proposalBookings.reduce(
          (acc, b) => acc + Number(pricingByBooking.get(b.id)?.depositAmountCents ?? 0),
          0
        );
        return sum > 0 ? sum : null;
      })(),
      totalAmountCents: totalCents,
      bookings: proposalBookings.map((b) => {
        const boat = boatsById.get(b.boatId);
        const pricing = pricingByBooking.get(b.id);
        const addOns = (b.addOns ?? null) as Array<{
          name: string;
          description?: string | null;
          unitPrice: number;
          quantity: number;
          total: number;
        }> | null;
        const basePriceCents = pricing ? Number(pricing.basePriceCents) : 0;
        const cleaningFeeCents = pricing ? Number(pricing.cleaningFeeCents ?? 0) : 0;
        const serviceFeeCents = pricing ? Number(pricing.serviceFeeCents ?? 0) : 0;
        const totalCents = pricing ? Number(pricing.totalAmountCents) : 0;
        const serviceFeeWaived = Boolean(pricing?.serviceFeeWaived);
        return {
          id: b.id,
          boatId: b.boatId,
          boatName: boat?.name ?? "Charter",
          boatMainImage: boat?.mainImage ?? null,
          timezone: boat?.timezone ?? null,
          startDateTime: b.startDateTime,
          endDateTime: b.endDateTime,
          basePriceCents,
          cleaningFeeCents,
          serviceFeeCents,
          serviceFeeWaived,
          totalCents,
          addOns: addOns ?? null,
        };
      }),
    };
  }

  /**
   * The chargeable charter party for a booking: the booking itself plus every
   * group sibling, each with its boat and pricing. Lead booking (the one
   * whose id was passed) comes first. Single bookings return a party of one —
   * checkout treats both identically.
   */
  async getChargeableParty(bookingId: string) {
    const [lead] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!lead) return null;

    const partyRows = lead.bookingGroupId
      ? await db
          .select()
          .from(bookings)
          .where(eq(bookings.bookingGroupId, lead.bookingGroupId))
          .orderBy(bookings.startDateTime)
      : [lead];

    // Lead first — Stripe metadata and the confirmation email key off it.
    partyRows.sort((a, b) => (a.id === bookingId ? -1 : b.id === bookingId ? 1 : 0));

    const boatIds = [...new Set(partyRows.map((b) => b.boatId).filter((id): id is string => !!id))];
    const [boatsRows, pricingRows] = await Promise.all([
      boatIds.length
        ? db
            .select({
              id: boats.id,
              name: boats.name,
              mainImage: boats.mainImage,
              timezone: boats.timezone,
            })
            .from(boats)
            .where(inArray(boats.id, boatIds))
        : Promise.resolve([]),
      db
        .select()
        .from(bookingPricing)
        .where(
          inArray(
            bookingPricing.bookingId,
            partyRows.map((b) => b.id)
          )
        ),
    ]);
    const boatsById = new Map(boatsRows.map((b) => [b.id, b]));
    const pricingByBooking = new Map(pricingRows.map((p) => [p.bookingId, p]));

    return partyRows.map((b) => ({
      booking: b,
      boat: b.boatId ? (boatsById.get(b.boatId) ?? null) : null,
      pricing: pricingByBooking.get(b.id) ?? null,
    }));
  }

  /**
   * The rows behind a proposal link — single booking or the whole party.
   * Null when the link isn't live (settled deal, or never published).
   */
  async getProposalBookingsByPublicToken(token: string) {
    const [first] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.publicToken, token))
      .limit(1);

    if (!first) return null;
    // PROPOSED = open proposal, BOOKED = accepted (paid or not) — the link
    // stays a living booking page through the whole journey.
    if (!["PROPOSED", "BOOKED"].includes(first.bookingStatus)) return null;
    // Unsent proposals are private: the token only works once the proposal has
    // actually been published (emailed/SMS'd or link explicitly shared).
    if (!first.publishedAt) return null;

    if (first.bookingGroupId) {
      const groupBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.bookingGroupId, first.bookingGroupId))
        .orderBy(bookings.startDateTime);
      return groupBookings;
    }

    return [first];
  }

  /**
   * Customer accepts the proposal — every open row in it becomes BOOKED
   */
  async acceptProposal(input: {
    publicToken: string;
    customerNote?: string | null;
    payNow?: boolean;
    chargeType?: "deposit" | "full";
  }): Promise<{ bookingIds: string[]; checkoutUrl?: string | null; accepted: number }> {
    const proposalBookings = await this.getProposalBookingsByPublicToken(input.publicToken);
    if (!proposalBookings || proposalBookings.length === 0) {
      throw new Error("Proposal not found or no longer open");
    }

    const now = new Date();
    const bookingIds: string[] = [];
    let accepted = 0;

    for (const b of proposalBookings) {
      // Idempotent: a retried submit or a mixed-status group must not blow
      // up — rows already past PROPOSED are kept as-is.
      if (b.bookingStatus === "PROPOSED") {
        // The proposal may have been out for days — re-check the slot at the
        // moment of acceptance, since BOOKED starts blocking the calendar.
        if (b.boatId && b.startDateTime && b.endDateTime) {
          await availabilityService.assertSlotAvailable(
            b.boatId,
            b.startDateTime,
            b.endDateTime,
            b.id
          );
        }
        try {
          await bookingStatusService.markBooked(b.id, {
            acceptedAt: now,
            acceptedCustomerNote: input.customerNote ?? null,
            reason: "Customer accepted the proposal",
            actorType: "user",
            channel: "web",
          });
        } catch (error) {
          // Race loser: the overlap constraint rejected the BOOKED flip.
          if (isOverlapConstraintError(error)) {
            throw new SlotUnavailableError([]);
          }
          throw error;
        }
        accepted += 1;
      }
      bookingIds.push(b.id);
    }

    let checkoutUrl: string | null = null;
    if (input.payNow && proposalBookings[0].allowPayment && bookingIds.length > 0) {
      try {
        const { createCheckoutSessionForBooking } = await import(
          "@/features/bookings/actions/stripe-checkout"
        );
        checkoutUrl = await createCheckoutSessionForBooking(bookingIds[0], {
          chargeType: input.chargeType,
        });
      } catch (err) {
        console.error("Failed to create checkout session for proposal:", err);
      }
    }

    return { bookingIds, checkoutUrl, accepted };
  }

  /**
   * Customer asked for changes from the public proposal page — lands on the
   * deal timeline (loud amber marker) so the admin sees it and edits the trip.
   */
  async requestProposalChanges(
    publicToken: string,
    message: string
  ): Promise<{ bookingId: string; customerName: string }> {
    const proposalBookings = await this.getProposalBookingsByPublicToken(publicToken);
    if (!proposalBookings || proposalBookings.length === 0) {
      throw new Error("Proposal not found");
    }

    for (const b of proposalBookings) {
      await bookingEventsService.logEvent({
        bookingId: b.id,
        eventType: BOOKING_EVENT_TYPES.CHANGE_REQUESTED,
        actorType: "user",
        channel: "web",
        displayMessage: "Customer requested changes",
        content: message,
      });
    }
    return { bookingId: proposalBookings[0].id, customerName: proposalBookings[0].customerName };
  }


  /**
   * Create an instant booking (payment at checkout)
   */
  async createInstantBooking(input: {
    boatId: string;
    pricingTierId: string | null;
    userId?: string | null;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    startDateTime: Date;
    endDateTime: Date | null;
    numberOfPassengers: number;
    needsCaptain: boolean;
    stripePaymentIntentId?: string;
    stripeCustomerId?: string;
    stripeCheckoutSessionId?: string;
    /** Priced add-on snapshot (already reflected in pricingOverrideCents total). */
    addOns?: BookingAddOn[];
    /** When provided (e.g. from webhook metadata), use these instead of calculating from boat+tier */
    pricingOverrideCents?: {
      basePriceCents: number;
      cleaningFeeCents: number;
      captainFeeCents: number;
      serviceFeeCents: number;
      totalPriceCents: number;
      depositAmountCents?: number;
    };
    /**
     * The paid-but-conflicting escape hatch: the customer's money is already
     * captured but the slot is taken, so the booking lands as PROPOSED (which
     * does NOT block the calendar and cannot violate the overlap constraint)
     * flagged for manual resolution — refund, move, or rebook.
     */
    holdForReview?: { reason: string };
  }): Promise<Booking> {
    const { boat, tier } = await fetchBoatAndTier(input.boatId, input.pricingTierId);

    let priceBreakdown: {
      basePriceCents: number;
      captainFeeCents: number;
      cleaningFeeCents: number;
      serviceFeeCents: number;
      totalPriceCents: number;
    };
    let depositAmountCents: number;
    let resolvedEndDateTime: Date | null;

    if (input.pricingOverrideCents) {
      priceBreakdown = input.pricingOverrideCents;
      depositAmountCents = input.pricingOverrideCents.depositAmountCents ?? 0;
      resolvedEndDateTime = input.endDateTime;
    } else {
      if (!tier) throw new Error("pricingTierId or pricingOverrideCents required");
      resolvedEndDateTime =
        input.endDateTime ?? calculateEndDateTime(input.startDateTime, tier.hours);
      const { serviceFeeRate } = await getAppSettings();
      const calc = calculateBookingPriceFromDollars(
        tier.price,
        boat.cleaningFee ?? 0,
        0,
        serviceFeeRate
      );
      priceBreakdown = calc;
      depositAmountCents = dollarsToCents(boat.depositAmount ?? 0);
    }

    const now = new Date();

    const [newBooking] = await db
      .insert(bookings)
      .values({
        bookingType: "INSTANT_BOOK",
        bookingStatus: input.holdForReview ? "PROPOSED" : "BOOKED",
        adminNotes: input.holdForReview
          ? `⚠ OVERLAP — paid instant booking held for manual resolution: ${input.holdForReview.reason}`
          : null,
        source: "WEBSITE" as BookingSource,
        userId: input.userId ?? null,
        boatOwnerId: boat.ownerId,
        boatId: input.boatId,
        pricingTierId: input.pricingTierId ?? null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        isMultiDay: false,
        needsCaptain: input.needsCaptain,
        startDateTime: input.startDateTime,
        endDateTime: resolvedEndDateTime,
        numberOfPassengers: input.numberOfPassengers,
        addOns: input.addOns && input.addOns.length > 0 ? input.addOns : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const bookingCurrency = boat.currency ?? "USD";

    // Create pricing record via pricing service
    await bookingPricingService.createPricing({
      bookingId: newBooking.id,
      basePriceCents: priceBreakdown.basePriceCents,
      captainFeeCents: priceBreakdown.captainFeeCents || null,
      cleaningFeeCents: priceBreakdown.cleaningFeeCents || null,
      serviceFeeCents: priceBreakdown.serviceFeeCents,
      depositAmountCents: depositAmountCents || null,
      totalAmountCents: priceBreakdown.totalPriceCents,
      currency: bookingCurrency,
    });

    // Create status history
    await bookingStatusService.createInitialHistory(
      newBooking.id,
      input.holdForReview ? "PROPOSED" : "BOOKED",
      input.userId,
      input.holdForReview
        ? "Instant booking — PAID but slot conflict, held for manual resolution"
        : "Instant booking - payment received"
    );

    // Create payment record
    await db.insert(payments).values({
      payableType: "BOOKING",
      payableId: newBooking.id,
      paymentType: "FULL_PAYMENT",
      amountCents: priceBreakdown.totalPriceCents,
      currency: bookingCurrency,
      status: "SUCCEEDED",
      paymentMethodType: "STRIPE_CHECKOUT",
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      stripeCustomerId: input.stripeCustomerId ?? null,
      processedAt: now,
    });

    return newBooking;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get paginated and filtered bookings
   * Returns cents-based pricing from booking_pricing table
   */
  async getAllBookings(filters?: BookingFilterInput): Promise<PaginatedBookingsResponse> {
    const { page, limit, offset } = resolveAdminListPagination(filters);

    const whereConditions = [];

    if (filters?.search) {
      whereConditions.push(
        or(
          ilike(bookings.customerName || "", `%${filters.search}%`),
          ilike(bookings.customerEmail || "", `%${filters.search}%`),
          ilike(bookings.customerPhone || "", `%${filters.search}%`),
          ilike(boats.name || "", `%${filters.search}%`)
        )
      );
    }

    if (filters?.bookingStatus) {
      whereConditions.push(eq(bookings.bookingStatus, filters.bookingStatus));
    }
    if (filters?.paymentStatus) {
      const ps = filters.paymentStatus;
      if (ps === "UNPAID") {
        whereConditions.push(
          sql`NOT EXISTS (
            SELECT 1 FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'SUCCEEDED' AND p.payment_type != 'REFUND'
          )`
        );
      } else if (ps === "PAID") {
        whereConditions.push(
          sql`COALESCE((
            SELECT SUM(p.amount_cents) FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'SUCCEEDED' AND p.payment_type != 'REFUND'
          ), 0) >= ${bookingPricing.totalAmountCents}`
        );
      } else if (ps === "DEPOSIT_PAID") {
        whereConditions.push(
          sql`COALESCE((
            SELECT SUM(p.amount_cents) FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'SUCCEEDED' AND p.payment_type != 'REFUND'
          ), 0) > 0`,
          sql`COALESCE((
            SELECT SUM(p.amount_cents) FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'SUCCEEDED' AND p.payment_type != 'REFUND'
          ), 0) < ${bookingPricing.totalAmountCents}`
        );
      } else if (ps === "REFUNDED") {
        whereConditions.push(
          sql`EXISTS (
            SELECT 1 FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND (p.status = 'REFUNDED' OR p.payment_type = 'REFUND')
          )`
        );
      } else if (ps === "FAILED") {
        whereConditions.push(
          sql`EXISTS (
            SELECT 1 FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'FAILED'
          )`,
          sql`NOT EXISTS (
            SELECT 1 FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'SUCCEEDED'
          )`
        );
      } else if (ps === "PROCESSING") {
        whereConditions.push(
          sql`EXISTS (
            SELECT 1 FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'PROCESSING'
          )`
        );
      } else if (ps === "CHARGEBACK") {
        whereConditions.push(
          sql`EXISTS (
            SELECT 1 FROM payment p
            WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
              AND p.status = 'CHARGEBACK'
          )`
        );
      }
    }
    if (filters?.bookingType) {
      // "INQUIRY"/"BOOKING" are stage-aware pseudo-types over the inquiry
      // family — same rule as getDisplayKind, so the filter always matches
      // what the row labels say. Raw types filter as themselves.
      if (filters.bookingType === "INQUIRY") {
        whereConditions.push(
          and(
            inArray(bookings.bookingType, [...INQUIRY_GROUP_TYPES]),
            sql`NOT ${pricedPastInquirySql()}`
          )
        );
      } else if (filters.bookingType === "BOOKING") {
        whereConditions.push(
          and(
            inArray(bookings.bookingType, [...INQUIRY_GROUP_TYPES]),
            pricedPastInquirySql()
          )
        );
      } else {
        whereConditions.push(eq(bookings.bookingType, filters.bookingType));
      }
    }
    if (filters?.dateFrom) {
      whereConditions.push(gte(bookings.startDateTime, new Date(filters.dateFrom)));
    }
    if (filters?.dateTo) {
      whereConditions.push(lte(bookings.startDateTime, new Date(filters.dateTo)));
    }
    if (filters?.boatId) {
      whereConditions.push(eq(bookings.boatId, filters.boatId));
    }
    if (filters?.bookingGroupId) {
      whereConditions.push(eq(bookings.bookingGroupId, filters.bookingGroupId));
    }
    if (filters?.customerId) {
      whereConditions.push(eq(bookings.userId, filters.customerId));
    }
    if (filters?.assignedAdminId) {
      whereConditions.push(eq(bookings.assignedAdminId, filters.assignedAdminId));
    }
    if (filters?.unassignedOnly) {
      whereConditions.push(isNull(bookings.assignedAdminId));
    }
    if (filters?.archivedView === true) {
      const archived = or(isNotNull(bookings.archivedAt), eq(bookings.bookingStatus, "CANCELLED"));
      if (archived) whereConditions.push(archived);
    } else if (filters?.archivedView === false) {
      const live = and(isNull(bookings.archivedAt), ne(bookings.bookingStatus, "CANCELLED"));
      if (live) whereConditions.push(live);
    }
    if (filters?.needsCaptain !== undefined) {
      whereConditions.push(eq(bookings.needsCaptain, filters.needsCaptain));
    }
    // Filter by amount (in cents now)
    if (filters?.minAmount) {
      const minCents = filters.minAmount * 100; // Convert dollars to cents for filter
      whereConditions.push(sql`${bookingPricing.totalAmountCents} >= ${minCents}`);
    }
    if (filters?.maxAmount) {
      const maxCents = filters.maxAmount * 100; // Convert dollars to cents for filter
      whereConditions.push(sql`${bookingPricing.totalAmountCents} <= ${maxCents}`);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const assignedAdmin = aliasedTable(users, "assignedAdmin");
    const captainUser = aliasedTable(users, "captainUser");

    const selectFields = {
      id: bookings.id,
      bookingType: bookings.bookingType,
      bookingStatus: bookings.bookingStatus,
      source: bookings.source,
      paymentStatus: sql<string>`(
        SELECT p.status FROM payment p 
        WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id} 
        ORDER BY p.created_at DESC LIMIT 1
      )`.as("paymentStatus"),
      totalPaidCents: sql<number>`COALESCE((
        SELECT SUM(p.amount_cents) FROM payment p
        WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
          AND p.status = 'SUCCEEDED' AND p.payment_type != 'REFUND'
      ), 0)`.as("totalPaidCents"),
      hasRefund: sql<boolean>`EXISTS (
        SELECT 1 FROM payment p
        WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
          AND (p.status = 'REFUNDED' OR p.payment_type = 'REFUND')
      )`.as("hasRefund"),
      customerName: bookings.customerName,
      customerEmail: bookings.customerEmail,
      customerPhone: bookings.customerPhone,
      startDateTime: bookings.startDateTime,
      endDateTime: bookings.endDateTime,
      numberOfPassengers: bookings.numberOfPassengers,
      // Pricing from booking_pricing table (in cents)
      totalAmountCents: bookingPricing.totalAmountCents,
      serviceFeeCents: bookingPricing.serviceFeeCents,
      serviceFeeWaived: bookingPricing.serviceFeeWaived,
      currency: bookingPricing.currency,
      // stripePaymentLinkId removed - stored in payments table
      needsCaptain: bookings.needsCaptain,
      createdAt: bookings.createdAt,
      // Lead-phase fields (unified deal hub)
      customerMessage: bookings.customerMessage,
      preferredDate: bookings.preferredDate,
      preferredTimeOfDay: bookings.preferredTimeOfDay,
      destination: bookings.destination,
      requestedDurationDays: bookings.requestedDurationDays,
      budgetCents: bookings.budgetCents,
      estimatedValueCents: bookings.estimatedValueCents,
      smsConsent: bookings.smsConsent,
      firstContactedAt: bookings.firstContactedAt,
      archivedAt: bookings.archivedAt,
      boatId: bookings.boatId,
      pricingTierId: bookings.pricingTierId,
      bookingGroupId: bookings.bookingGroupId,
      bookingGroupName: bookingGroups.name,
      // Party size: how many boats sail under this booking's group (1 = solo).
      bookingGroupSize: sql<number>`CASE WHEN ${bookings.bookingGroupId} IS NOT NULL THEN (SELECT COUNT(*)::int FROM ${bookings} AS party WHERE party.booking_group_id = ${bookings.bookingGroupId}) ELSE NULL END`,
      boatName: boats.name,
      boatCategory: boats.category,
      boatMainImage: boats.mainImage,
      boatTimezone: boats.timezone,
      userId: bookings.userId,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      userProfileImage: users.profileImage,
      assignedAdminId: bookings.assignedAdminId,
      assignedAdminFirstName: assignedAdmin.firstName,
      assignedAdminLastName: assignedAdmin.lastName,
      assignedAdminEmail: assignedAdmin.email,
      captainUserId: bookings.captainUserId,
      captainFirstName: captainUser.firstName,
      captainLastName: captainUser.lastName,
      captainEmail: captainUser.email,
      // Ops fields (from booking_ops - Excel workflow tracking)
      opsExpenseCents: bookingOps.expenseCents,
      opsGmvCents: bookingOps.gmvCents,
      opsRevenueCents: bookingOps.revenueCents,
      opsPaidCents: bookingOps.paidCents,
      opsSentToOwnerCents: bookingOps.sentToOwnerCents,
      opsBalanceOwnerCents: bookingOps.balanceOwnerCents,
      opsBalanceClientCents: bookingOps.balanceClientCents,
      opsCrewName: bookingOps.crewName,
      opsConnected: bookingOps.connected,
      opsClientPaid: bookingOps.clientPaid,
      opsCaptainPaid: bookingOps.captainPaid,
      opsAllPaid: bookingOps.allPaid,
      opsSheetsSent: bookingOps.sheetsSent,
      opsAgentCode: bookingOps.agentCode,
      opsCommissionAgentCents: bookingOps.commissionAgentCents,
      opsCommissionKosCents: bookingOps.commissionKosCents,
      opsCommissionCents: bookingOps.commissionCents,
      opsSourceOverride: bookingOps.sourceOverride,
    };

    const [bookingsData, countResult] = await Promise.all([
      db
        .select(selectFields)
        .from(bookings)
        .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
        .leftJoin(bookingOps, eq(bookings.id, bookingOps.bookingId))
        .leftJoin(boats, eq(bookings.boatId, boats.id))
        .leftJoin(bookingGroups, eq(bookings.bookingGroupId, bookingGroups.id))
        .leftJoin(users, eq(bookings.userId, users.id))
        .leftJoin(assignedAdmin, eq(bookings.assignedAdminId, assignedAdmin.id))
        .leftJoin(captainUser, eq(bookings.captainUserId, captainUser.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(resolveBoardOrder(filters)),
      db
        .select({ value: count() })
        .from(bookings)
        .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
        .leftJoin(boats, eq(bookings.boatId, boats.id))
        .where(whereClause),
    ]);

    const mappedBookings: BookingListItem[] = bookingsData.map((b) => {
      const totalAmountCents = b.totalAmountCents ?? 0;
      const totalPaidCents = Number(b.totalPaidCents) || 0;
      const hasRefund = Boolean(b.hasRefund);
      const latestPaymentStatus = b.paymentStatus ?? null;

      const serviceFeeCents = b.serviceFeeCents != null ? Number(b.serviceFeeCents) : null;
      const serviceFeeWaived = Boolean(b.serviceFeeWaived);
      return {
        ...b,
        totalAmountCents,
        serviceFeeCents,
        serviceFeeWaived,
        totalPaidCents,
        hasRefund,
        currency: b.currency ?? "USD",
        paymentStatus: latestPaymentStatus,
        // "Paid" means the customer paid what they OWE — fee-aware.
        paymentDisplayStatus: computePaymentDisplayStatus({
          totalPaidCents,
          totalAmountCents: effectiveTotalCents({ totalAmountCents, serviceFeeCents, serviceFeeWaived }),
          latestPaymentStatus,
          hasRefund,
        }),
      };
    });

    return {
      bookings: mappedBookings,
      totalCount: countResult[0].value,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].value / limit),
    };
  }

  /**
   * Deal counts grouped by bookingType for the command strip. Respects the
   * same base filters as the list (search / scope / date / archived) but NOT
   * bookingType itself, so every segment shows its true count while one is
   * selected (faceted-filter pattern).
   */
  async getBookingTypeCounts(
    filters?: Pick<
      BookingFilterInput,
      | "search"
      | "dateFrom"
      | "dateTo"
      | "assignedAdminId"
      | "unassignedOnly"
      | "archivedView"
    >
  ): Promise<{ counts: Record<string, number>; total: number }> {
    const conditions = [];

    if (filters?.search) {
      const clause = or(
        ilike(bookings.customerName, `%${filters.search}%`),
        ilike(bookings.customerEmail, `%${filters.search}%`),
        ilike(bookings.customerPhone, `%${filters.search}%`),
        ilike(boats.name, `%${filters.search}%`)
      );
      if (clause) conditions.push(clause);
    }
    if (filters?.dateFrom) {
      conditions.push(gte(bookings.startDateTime, new Date(filters.dateFrom)));
    }
    if (filters?.dateTo) {
      conditions.push(lte(bookings.startDateTime, new Date(filters.dateTo)));
    }
    if (filters?.assignedAdminId) {
      conditions.push(eq(bookings.assignedAdminId, filters.assignedAdminId));
    }
    if (filters?.unassignedOnly) {
      conditions.push(isNull(bookings.assignedAdminId));
    }
    if (filters?.archivedView === true) {
      const archived = or(isNotNull(bookings.archivedAt), eq(bookings.bookingStatus, "CANCELLED"));
      if (archived) conditions.push(archived);
    } else if (filters?.archivedView === false) {
      const live = and(isNull(bookings.archivedAt), ne(bookings.bookingStatus, "CANCELLED"));
      if (live) conditions.push(live);
    }

    // Bucket by DISPLAY kind, not entry type — the inquiry family splits into
    // INQUIRY (still a lead) vs BOOKING (priced past inquiry) with the exact
    // rule the rows use (getDisplayKind), so strip counts match row labels.
    const displayKind = sql<string>`CASE
      WHEN ${inArray(bookings.bookingType, [...INQUIRY_GROUP_TYPES])}
      THEN CASE WHEN ${pricedPastInquirySql()} THEN 'BOOKING' ELSE 'INQUIRY' END
      ELSE ${bookings.bookingType}::text
    END`;

    // GROUP BY 1 (ordinal), NOT the expression again: re-rendering the CASE
    // gives it fresh $n placeholders, and Postgres then treats the SELECT and
    // GROUP BY copies as different expressions and rejects the query.
    const rows = await db
      .select({ kind: displayKind, value: count() })
      .from(bookings)
      .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sql`1`);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      counts[r.kind] = Number(r.value);
      total += Number(r.value);
    }
    return { counts, total };
  }

  /**
   * Get single booking by ID with full details
   * Pricing comes from booking_pricing table (in cents)
   */
  async getBookingById(id: string): Promise<BookingDetails | null> {
    const assignedAdmin = aliasedTable(users, "assignedAdmin");
    const boatOwner = aliasedTable(users, "boatOwner");
    const captainUser = aliasedTable(users, "captainUser");

    const [booking] = await db
      .select({
        id: bookings.id,
        bookingType: bookings.bookingType,
        bookingStatus: bookings.bookingStatus,
        source: bookings.source,
        userId: bookings.userId,
        boatOwnerId: bookings.boatOwnerId,
        boatId: bookings.boatId,
        captainUserId: bookings.captainUserId,
        captainFirstName: captainUser.firstName,
        captainLastName: captainUser.lastName,
        captainEmail: captainUser.email,
        pricingTierId: bookings.pricingTierId,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        customerPhone: bookings.customerPhone,
        isMultiDay: bookings.isMultiDay,
        needsCaptain: bookings.needsCaptain,
        startDateTime: bookings.startDateTime,
        endDateTime: bookings.endDateTime,
        numberOfPassengers: bookings.numberOfPassengers,
        addOns: bookings.addOns,
        pickupLocation: bookings.pickupLocation,
        dropoffLocation: bookings.dropoffLocation,
        publicToken: bookings.publicToken,
        publishedAt: bookings.publishedAt,
        // Lead-phase fields (unified deal hub)
        customerMessage: bookings.customerMessage,
        preferredDate: bookings.preferredDate,
        preferredTimeOfDay: bookings.preferredTimeOfDay,
        destination: bookings.destination,
        requestedDurationDays: bookings.requestedDurationDays,
        budgetCents: bookings.budgetCents,
        estimatedValueCents: bookings.estimatedValueCents,
        smsConsent: bookings.smsConsent,
        firstContactedAt: bookings.firstContactedAt,
        archivedAt: bookings.archivedAt,
        // stripePaymentLinkId removed - stored in payments table
        // Pricing from booking_pricing (in cents)
        basePriceCents: bookingPricing.basePriceCents,
        captainFeeCents: bookingPricing.captainFeeCents,
        cleaningFeeCents: bookingPricing.cleaningFeeCents,
        serviceFeeCents: bookingPricing.serviceFeeCents,
        serviceFeeWaived: bookingPricing.serviceFeeWaived,
        allowPayment: bookings.allowPayment,
        taxAmountCents: bookingPricing.taxAmountCents,
        discountAmountCents: bookingPricing.discountAmountCents,
        totalAmountCents: bookingPricing.totalAmountCents,
        depositAmountCents: bookingPricing.depositAmountCents,
        currency: bookingPricing.currency,
        paymentStatus: sql<string>`(
          SELECT p.status FROM payment p 
          WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id} 
          ORDER BY p.created_at DESC LIMIT 1
        )`.as("paymentStatus"),
        paymentMethod: sql<string>`(
          SELECT p.payment_method_type FROM payment p 
          WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id} 
          ORDER BY p.created_at DESC LIMIT 1
        )`.as("paymentMethod"),
        totalPaidCents: sql<number>`COALESCE((
          SELECT SUM(p.amount_cents) FROM payment p
          WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
            AND p.status = 'SUCCEEDED' AND p.payment_type != 'REFUND'
        ), 0)`.as("totalPaidCents"),
        hasRefund: sql<boolean>`EXISTS (
          SELECT 1 FROM payment p
          WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookings.id}
            AND (p.status = 'REFUNDED' OR p.payment_type = 'REFUND')
        )`.as("hasRefund"),
        bookingGroupId: bookings.bookingGroupId,
        bookingGroupName: bookingGroups.name,
        assignedAdminId: bookings.assignedAdminId,
        // contactedAt removed - derive from booking_admin_notes
        cancelledAt: bookings.cancelledAt,
        cancellationReason: bookings.cancellationReason,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        expiresAt: bookings.expiresAt,
        // Boat info
        boatName: boats.name,
        boatCategory: boats.category,
        boatMainImage: boats.mainImage,
        boatCapacity: boats.capacity,
        boatTimezone: boats.timezone,
        // User info
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userProfileImage: users.profileImage,
        // Boat owner info
        boatOwnerFirstName: boatOwner.firstName,
        boatOwnerLastName: boatOwner.lastName,
        boatOwnerEmail: boatOwner.email,
        // Assigned admin info
        assignedAdminFirstName: assignedAdmin.firstName,
        assignedAdminLastName: assignedAdmin.lastName,
        assignedAdminEmail: assignedAdmin.email,
      })
      .from(bookings)
      .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .leftJoin(bookingGroups, eq(bookings.bookingGroupId, bookingGroups.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(boatOwner, eq(bookings.boatOwnerId, boatOwner.id))
      .leftJoin(assignedAdmin, eq(bookings.assignedAdminId, assignedAdmin.id))
      .leftJoin(captainUser, eq(bookings.captainUserId, captainUser.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) return null;

    const totalAmountCents = booking.totalAmountCents ?? 0;
    const totalPaidCents = Number(booking.totalPaidCents) || 0;
    const hasRefund = Boolean(booking.hasRefund);
    const latestPaymentStatus = booking.paymentStatus ?? null;

    const details: BookingDetails = {
      ...booking,
      addOns: (booking.addOns as BookingAddOn[] | null) ?? null,
      totalAmountCents,
      totalPaidCents,
      hasRefund,
      currency: booking.currency ?? "USD",
      paymentStatus: latestPaymentStatus,
      paymentMethod: booking.paymentMethod ?? null,
      serviceFeeWaived: Boolean(booking.serviceFeeWaived),
      allowPayment: Boolean(booking.allowPayment),
      paymentDisplayStatus: computePaymentDisplayStatus({
        totalPaidCents,
        totalAmountCents: effectiveTotalCents({
          totalAmountCents,
          serviceFeeCents: booking.serviceFeeCents != null ? Number(booking.serviceFeeCents) : null,
          serviceFeeWaived: Boolean(booking.serviceFeeWaived),
        }),
        latestPaymentStatus,
        hasRefund,
      }),
    };
    return details;
  }

  /**
   * Get booking with all related data (pricing, payments, history, notes)
   */
  async getBookingWithRelations(id: string): Promise<BookingWithRelations | null> {
    const assignedAdmin = aliasedTable(users, "assignedAdmin");
    const noteAdmin = aliasedTable(users, "noteAdmin");
    const historyUser = aliasedTable(users, "historyUser");

    // Get core booking with boat and user joins
    const [booking] = await db
      .select({
        id: bookings.id,
        bookingType: bookings.bookingType,
        bookingStatus: bookings.bookingStatus,
        source: bookings.source,
        userId: bookings.userId,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        customerPhone: bookings.customerPhone,
        boatId: bookings.boatId,
        pricingTierId: bookings.pricingTierId,
        startDateTime: bookings.startDateTime,
        endDateTime: bookings.endDateTime,
        numberOfPassengers: bookings.numberOfPassengers,
        isMultiDay: bookings.isMultiDay,
        needsCaptain: bookings.needsCaptain,
        pickupLocation: bookings.pickupLocation,
        dropoffLocation: bookings.dropoffLocation,
        assignedAdminId: bookings.assignedAdminId,
        cancelledAt: bookings.cancelledAt,
        cancellationReason: bookings.cancellationReason,
        cancelledBy: bookings.cancelledBy,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        expiresAt: bookings.expiresAt,
        paymentType: bookings.paymentType,
        addOns: bookings.addOns,
        // Boat
        boatName: boats.name,
        boatCategory: boats.category,
        boatMainImage: boats.mainImage,
        boatCapacity: boats.capacity,
        boatTimezone: boats.timezone,
        boatOwnerId: boats.ownerId,
        // User
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userProfileImage: users.profileImage,
        // Assigned admin
        assignedAdminFirstName: assignedAdmin.firstName,
        assignedAdminLastName: assignedAdmin.lastName,
        assignedAdminEmail: assignedAdmin.email,
      })
      .from(bookings)
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(assignedAdmin, eq(bookings.assignedAdminId, assignedAdmin.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!booking) return null;

    // Fetch related data in parallel
    const eventActor = aliasedTable(users, "eventActor");
    const [pricingData, paymentsData, historyData, notesData, eventsData] = await Promise.all([
      db.select().from(bookingPricing).where(eq(bookingPricing.bookingId, id)).limit(1),
      db
        .select()
        .from(payments)
        .where(and(eq(payments.payableType, "BOOKING"), eq(payments.payableId, id)))
        .orderBy(desc(payments.createdAt)),
      db
        .select({
          id: bookingStatusHistory.id,
          fromStatus: bookingStatusHistory.fromStatus,
          toStatus: bookingStatusHistory.toStatus,
          changedByUserId: bookingStatusHistory.changedByUserId,
          reason: bookingStatusHistory.reason,
          createdAt: bookingStatusHistory.createdAt,
          changedByFirstName: historyUser.firstName,
          changedByLastName: historyUser.lastName,
        })
        .from(bookingStatusHistory)
        .leftJoin(historyUser, eq(bookingStatusHistory.changedByUserId, historyUser.id))
        .where(eq(bookingStatusHistory.bookingId, id))
        .orderBy(desc(bookingStatusHistory.createdAt)),
      db
        .select({
          id: bookingAdminNotes.id,
          adminUserId: bookingAdminNotes.adminUserId,
          noteType: bookingAdminNotes.noteType,
          content: bookingAdminNotes.content,
          createdAt: bookingAdminNotes.createdAt,
          adminFirstName: noteAdmin.firstName,
          adminLastName: noteAdmin.lastName,
        })
        .from(bookingAdminNotes)
        .leftJoin(noteAdmin, eq(bookingAdminNotes.adminUserId, noteAdmin.id))
        .where(eq(bookingAdminNotes.bookingId, id))
        .orderBy(desc(bookingAdminNotes.createdAt)),
      db
        .select({
          id: bookingEvents.id,
          actorType: bookingEvents.actorType,
          actorId: bookingEvents.actorId,
          eventType: bookingEvents.eventType,
          channel: bookingEvents.channel,
          displayMessage: bookingEvents.displayMessage,
          content: bookingEvents.content,
          contactMethod: bookingEvents.contactMethod,
          metadata: bookingEvents.metadata,
          createdAt: bookingEvents.createdAt,
          actorFirstName: eventActor.firstName,
          actorLastName: eventActor.lastName,
          actorEmail: eventActor.email,
        })
        .from(bookingEvents)
        .leftJoin(eventActor, eq(bookingEvents.actorId, eventActor.id))
        .where(eq(bookingEvents.bookingId, id))
        .orderBy(desc(bookingEvents.createdAt)),
    ]);

    const pricing = pricingData[0];

    return {
      id: booking.id,
      bookingType: booking.bookingType,
      bookingStatus: booking.bookingStatus,
      source: booking.source,
      userId: booking.userId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      boatId: booking.boatId,
      pricingTierId: booking.pricingTierId,
      startDateTime: booking.startDateTime,
      endDateTime: booking.endDateTime,
      numberOfPassengers: booking.numberOfPassengers,
      isMultiDay: booking.isMultiDay,
      needsCaptain: booking.needsCaptain,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      assignedAdminId: booking.assignedAdminId,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      cancelledBy: booking.cancelledBy,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      expiresAt: booking.expiresAt,
      paymentType: booking.paymentType,
      addOns: (booking.addOns ?? null) as Array<{
        name: string;
        description?: string | null;
        unitPrice: number;
        quantity: number;
        total: number;
      }> | null,

      pricing: pricing
        ? {
            basePriceCents: Number(pricing.basePriceCents),
            captainFeeCents: pricing.captainFeeCents ? Number(pricing.captainFeeCents) : null,
            cleaningFeeCents: pricing.cleaningFeeCents ? Number(pricing.cleaningFeeCents) : null,
            serviceFeeCents: pricing.serviceFeeCents ? Number(pricing.serviceFeeCents) : null,
            taxAmountCents: pricing.taxAmountCents ? Number(pricing.taxAmountCents) : null,
            discountAmountCents: pricing.discountAmountCents
              ? Number(pricing.discountAmountCents)
              : null,
            discountCode: pricing.discountCode,
            depositAmountCents: pricing.depositAmountCents
              ? Number(pricing.depositAmountCents)
              : null,
            totalAmountCents: Number(pricing.totalAmountCents),
            currency: pricing.currency,
            depositDueDate: pricing.depositDueDate,
            remainderDueDate: pricing.remainderDueDate,
          }
        : null,

      payments: paymentsData.map((p) => ({
        id: p.id,
        paymentType: p.paymentType,
        amountCents: Number(p.amountCents),
        currency: p.currency,
        status: p.status,
        paymentMethodType: p.paymentMethodType,
        paymentMethodDetail: p.paymentMethodDetail,
        stripePaymentIntentId: p.stripePaymentIntentId,
        stripePaymentLinkId: p.stripePaymentLinkId,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
      })),

      statusHistory: historyData.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedByUserId: h.changedByUserId,
        changedByName:
          h.changedByFirstName && h.changedByLastName
            ? `${h.changedByFirstName} ${h.changedByLastName}`
            : null,
        reason: h.reason,
        createdAt: h.createdAt,
      })),

      adminNotes: notesData.map((n) => ({
        id: n.id,
        adminUserId: n.adminUserId,
        adminName:
          n.adminFirstName && n.adminLastName ? `${n.adminFirstName} ${n.adminLastName}` : null,
        noteType: n.noteType,
        content: n.content,
        createdAt: n.createdAt,
      })),

      activityEvents: eventsData.map((e) => ({
        id: e.id,
        actorType: e.actorType,
        eventType: e.eventType,
        channel: e.channel,
        displayMessage: e.displayMessage,
        content: e.content,
        contactMethod: e.contactMethod,
        metadata: e.metadata as Record<string, unknown> | null,
        createdAt: e.createdAt,
        actorName:
          e.actorFirstName || e.actorLastName
            ? `${e.actorFirstName || ""} ${e.actorLastName || ""}`.trim()
            : e.actorEmail || (e.actorType === "system" ? "System" : "—"),
      })),

      boat: {
        id: booking.boatId,
        name: booking.boatName ?? "",
        category: booking.boatCategory,
        mainImage: booking.boatMainImage,
        capacity: booking.boatCapacity,
        timezone: booking.boatTimezone,
        ownerId: booking.boatOwnerId,
      },

      user: booking.userId
        ? {
            id: booking.userId,
            firstName: booking.userFirstName,
            lastName: booking.userLastName,
            email: booking.userEmail ?? "",
            profileImage: booking.userProfileImage,
          }
        : null,

      assignedAdmin: booking.assignedAdminId
        ? {
            id: booking.assignedAdminId,
            firstName: booking.assignedAdminFirstName,
            lastName: booking.assignedAdminLastName,
            email: booking.assignedAdminEmail ?? "",
          }
        : null,
    };
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  /**
   * Reprice booking after switching boats (tier affinity + default tier fallback).
   */
  /**
   * "Actually, we want a second boat" — grow an existing booking into a
   * charter party (or grow the party). Creates the group on first use, then
   * inserts a sibling row: same customer snapshot, same trip window by
   * default, its own boat/tier/pricing. The sibling enters as PROPOSED, so the
   * calendar isn't blocked until the customer re-accepts — the lead's one
   * proposal link now shows every boat, and the admin resends it.
   */
  async addBoatToParty(
    bookingId: string,
    input: { boatId: string; pricingTierId: string },
    adminId: string | null
  ): Promise<{ siblingId: string; groupId: string }> {
    const lead = await this.getBookingById(bookingId);
    if (!lead) throw new Error(`Booking not found: ${bookingId}`);
    if (!["PROPOSED", "BOOKED"].includes(lead.bookingStatus)) {
      throw new Error("Only a priced booking can grow into a charter party");
    }
    if (!lead.startDateTime) throw new Error("Set the trip dates before adding a boat");
    if (!lead.customerName || !lead.customerEmail) {
      throw new Error("Add the customer's name and email before adding a boat");
    }

    const { boatsById, tiersById } = await fetchBoatsAndTiersBulk(
      [input.boatId],
      [input.pricingTierId]
    );
    const boat = boatsById.get(input.boatId);
    const tier = tiersById.get(input.pricingTierId);
    if (!boat) throw new Error("Boat not found");
    if (!tier || tier.boatId !== input.boatId) throw new Error("Pick a pricing option for this boat");

    // First extra boat creates the container.
    let groupId = lead.bookingGroupId ?? null;
    if (!groupId) {
      const group = await bookingGroupService.create({
        name: `${lead.customerName ?? "Charter"} party`,
        notes: null,
        createdById: adminId,
      });
      groupId = group.id;
      await db
        .update(bookings)
        .set({ bookingGroupId: groupId, updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    }

    const startDateTime = new Date(lead.startDateTime);
    const endDateTime = lead.endDateTime
      ? new Date(lead.endDateTime)
      : calculateEndDateTime(startDateTime, tier.hours);

    // Same gate as the composer: never grow a party onto a sold slot.
    await assertBoatWindowFree(boat.id, boat.name, startDateTime, endDateTime);

    const [sibling] = await db
      .insert(bookings)
      .values({
        bookingType: lead.bookingType as BookingType,
        bookingStatus: "PROPOSED",
        source: "ADMIN" as BookingSource,
        userId: lead.userId ?? null,
        boatOwnerId: boat.ownerId,
        boatId: boat.id,
        pricingTierId: tier.id,
        bookingGroupId: groupId,
        customerName: lead.customerName,
        customerEmail: lead.customerEmail,
        customerPhone: lead.customerPhone ?? null,
        isMultiDay: false,
        startDateTime,
        endDateTime,
        numberOfPassengers: lead.numberOfPassengers,
        pickupLocation: lead.pickupLocation ?? null,
        dropoffLocation: lead.dropoffLocation ?? null,
        needsCaptain: boat.crewRequired,
        assignedAdminId: lead.assignedAdminId ?? adminId,
        publicToken: null, // the lead's link shows the whole party
        publishedAt: null,
      })
      .returning({ id: bookings.id });

    await bookingStatusService.createInitialHistory(
      sibling.id,
      "PROPOSED",
      adminId,
      "Boat added to charter party"
    );
    await bookingPricingService.createPricingWithCalculation(sibling.id, {
      basePriceCents: dollarsToCents(tier.price),
      addOnsCents: 0,
      cleaningFeeCents: dollarsToCents(boat.cleaningFee ?? 0),
      depositAmountCents: dollarsToCents(boat.depositAmount ?? 0) || undefined,
      currency: boat.currency ?? "USD",
    });
    await bookingEventsService.logEvent({
      bookingId,
      eventType: BOOKING_EVENT_TYPES.UPDATED,
      actorType: "admin",
      actorId: adminId,
      channel: "admin_portal",
      displayMessage: `${boat.name} added to the charter party`,
      metadata: { siblingBookingId: sibling.id, groupId },
    });

    return { siblingId: sibling.id, groupId };
  }

  async applyBoatIdChange(
    bookingId: string,
    newBoatId: string,
    before: BookingDetails
  ): Promise<void> {
    const [boat] = await db
      .select({
        id: boats.id,
        cleaningFee: boats.cleaningFee,
        depositAmount: boats.depositAmount,
        currency: boats.currency,
      })
      .from(boats)
      .where(eq(boats.id, newBoatId))
      .limit(1);

    if (!boat) throw new Error(`Boat not found: ${newBoatId}`);

    let nextTierId: string | null = before.pricingTierId ?? null;
    let basePriceDollars: number;

    let matchedTier: typeof boatPricingTiers.$inferSelect | undefined;
    if (nextTierId) {
      const [t] = await db
        .select()
        .from(boatPricingTiers)
        .where(eq(boatPricingTiers.id, nextTierId))
        .limit(1);
      if (t?.boatId === newBoatId) matchedTier = t;
    }

    if (matchedTier) {
      nextTierId = matchedTier.id;
      basePriceDollars = matchedTier.price;
    } else {
      nextTierId = null;
      const tiersOnBoat = await db
        .select()
        .from(boatPricingTiers)
        .where(and(eq(boatPricingTiers.boatId, newBoatId), eq(boatPricingTiers.isActive, true)));

      const preferred =
        tiersOnBoat.find((t) => t.isDefault) ??
        [...tiersOnBoat].sort((a, b) => a.price - b.price || a.hours - b.hours)[0];

      if (preferred) {
        nextTierId = preferred.id;
        basePriceDollars = preferred.price;
      } else {
        basePriceDollars = (before.basePriceCents ?? 0) / 100;
      }
    }

    const captainFeeDollars = (before.captainFeeCents ?? 0) / 100;
    const cleaningFeeDollars = boat.cleaningFee ?? 0;

    // Add-ons ride along on a swap: their JSON lines stay on the booking, so
    // the new total must keep counting them (it used to silently drop them).
    const addOnsCents = dollarsToCents(
      (before.addOns ?? []).reduce((sum, a) => sum + (Number(a.total) || 0), 0)
    );
    const { serviceFeeRate } = await getAppSettings();
    const breakdown = calculateBookingPriceCents(
      dollarsToCents(basePriceDollars),
      dollarsToCents(cleaningFeeDollars),
      dollarsToCents(captainFeeDollars),
      addOnsCents,
      serviceFeeRate
    );

    await db
      .update(bookings)
      .set({
        boatId: newBoatId,
        pricingTierId: nextTierId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    await db
      .update(bookingPricing)
      .set({
        basePriceCents: breakdown.basePriceCents,
        cleaningFeeCents: breakdown.cleaningFeeCents || null,
        captainFeeCents: breakdown.captainFeeCents || null,
        serviceFeeCents: breakdown.serviceFeeCents,
        totalAmountCents: breakdown.totalPriceCents,
        depositAmountCents: dollarsToCents(boat.depositAmount ?? 0) || null,
        currency: boat.currency ?? "USD",
      })
      .where(eq(bookingPricing.bookingId, bookingId));
  }

  /**
   * Apply a single validated field change (admin one-field-at-a-time editor).
   */
  async applyBookingSingleFieldUpdate(
    id: string,
    update: BookingSingleFieldUpdate,
    actorId: string
  ): Promise<BookingDetails> {
    const current = await this.getBookingById(id);
    if (!current) {
      throw new Error(`Booking not found: ${id}`);
    }

    const previousValue = auditSnapshotForBookingField(update.field, current);

    if (update.field === "boatId") {
      if (update.value === current.boatId) {
        return current;
      }
      await this.applyBoatIdChange(id, update.value, current);
    } else {
      const rowPatch = bookingRowPatchFromSingleFieldUpdate(update);

      // The trip window arrives as an atomic pair (end-after-start already
      // validated in the patch builder). BOOKED holds the
      // calendar, so recheck the new window — friendly refusal instead of a
      // constraint blast.
      if (
        update.field === "tripWindow" &&
        current.bookingStatus === "BOOKED" &&
        current.boatId &&
        rowPatch.startDateTime &&
        rowPatch.endDateTime
      ) {
        await availabilityService.assertSlotAvailable(
          current.boatId,
          rowPatch.startDateTime as Date,
          rowPatch.endDateTime as Date,
          id
        );
      }

      try {
        await db
          .update(bookings)
          .set({ ...rowPatch, updatedAt: new Date() })
          .where(eq(bookings.id, id));
      } catch (error) {
        // Race loser on the no-overlap exclusion constraint.
        if (isOverlapConstraintError(error)) {
          throw new SlotUnavailableError([]);
        }
        throw error;
      }
    }

    const next = await this.getBookingById(id);
    if (!next) {
      throw new Error(`Failed to load booking after update: ${id}`);
    }

    const nextValue = auditSnapshotForBookingField(update.field, next);
    if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      await bookingEventsService.logBookingUpdated({
        bookingId: id,
        actorId,
        previousState: { [update.field]: previousValue },
        newState: { [update.field]: nextValue },
        changedFields: [update.field],
      });
    }

    return next;
  }

  /**
   * Assign admin to booking (or clear assignment when adminId is null).
   */
  async assignAdmin(
    bookingId: string,
    adminId: string | null,
    performedByUserId: string
  ): Promise<void> {
    const [row] = await db
      .select({ assignedAdminId: bookings.assignedAdminId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    const previous = row?.assignedAdminId ?? null;
    if (previous === adminId) return;
    await db
      .update(bookings)
      .set({
        assignedAdminId: adminId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
    await bookingEventsService.logAssignedAdminChanged({
      bookingId,
      actorId: performedByUserId,
      previousAdminId: previous,
      newAdminId: adminId,
    });
  }

  /**
   * Assign captain to booking (`bookings.captain_user_id`), or clear when null.
   */
  async assignCaptain(
    bookingId: string,
    captainUserId: string | null,
    performedByUserId: string
  ): Promise<void> {
    const [row] = await db
      .select({ captainUserId: bookings.captainUserId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    const previous = row?.captainUserId ?? null;
    if (previous === captainUserId) return;
    await db
      .update(bookings)
      .set({
        captainUserId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
    await bookingEventsService.logAssignedCaptainChanged({
      bookingId,
      actorId: performedByUserId,
      previousCaptainUserId: previous,
      newCaptainUserId: captainUserId,
    });
  }

  /**
   * Count bookings for a linked customer account (admin client card).
   */
  async countBookingsForUser(userId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(bookings)
      .where(eq(bookings.userId, userId));
    return row?.value ?? 0;
  }

  /**
   * Delete a booking
   */
  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }
}

// Export singleton instance
export const bookingService = new BookingService();

/**
 * Board column sort. Default stays newest-created-first; clicking Date or
 * GMV sorts by trip start / effective GMV (ops override, else fee-exclusive
 * quote, else the lead's estimate) with NULLs always last so dateless
 * inquiries don't crowd the top.
 */
function resolveBoardOrder(filters?: BookingFilterInput) {
  const dir = filters?.sortOrder === "asc" ? sql`ASC` : sql`DESC`;
  if (filters?.sortBy === "date") {
    return sql`${bookings.startDateTime} ${dir} NULLS LAST`;
  }
  if (filters?.sortBy === "gmv") {
    return sql`COALESCE(${bookingOps.gmvCents}, ${bookingPricing.totalAmountCents} - COALESCE(${bookingPricing.serviceFeeCents}, 0), ${bookings.estimatedValueCents}, ${bookings.budgetCents}) ${dir} NULLS LAST`;
  }
  return desc(bookings.createdAt);
}
