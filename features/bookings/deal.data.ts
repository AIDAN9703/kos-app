import "server-only";

import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import { bookingSingleFieldUpdateSchema } from "@/features/bookings/booking-single-field-update";
import type { BookingListItem, PaginatedBookingsResponse } from "@/features/bookings/booking.types";
import {
  createBookingFullSchema,
  type BookingFilterInput,
  type CreateBookingFullInput,
} from "@/features/bookings/booking.validation";
import { buildDealPrefillForBookingForm } from "@/features/bookings/lib/deal-prefill";
import { bookingCrewService } from "@/features/bookings/services/booking-crew.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { bookingExpenseLineService } from "@/features/bookings/services/booking-expense-line.service";
import { bookingOpsService } from "@/features/bookings/services/booking-ops.service";
import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import {
  availabilityService,
  isOverlapConstraintError,
} from "@/features/availability/services/availability.service";
import { getBoatTiers } from "@/features/boats/boat.data";
import { boatService } from "@/features/boats/boat.service";
import { paymentService } from "@/features/payments/payment.service";
import { captainProfileService } from "@/features/profiles/captain-profile.service";
import { crewProfileService } from "@/features/profiles/crew-profile.service";
import { userService } from "@/features/users/user.service";
import type { statement } from "@/shared/lib/auth/permissions";
import { AccessDenied, pgErrorCode, UserFacingError } from "@/shared/lib/errors";
import { sendProposalEmail } from "@/shared/lib/services/email.service";
import { sendSms } from "@/shared/lib/services/twilio.service";
import { assertCan, can, type SessionUser } from "@/shared/lib/utils/auth-utils";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Deals data layer (admins and brokers): every read and change to a deal.
 * Each function checks the role (shared/lib/auth/permissions.ts) and that the
 * deal is theirs: admins (booking:view-all) act on every deal, a broker only
 * on the deals assigned to them — and on a charter party only when every boat
 * in it is theirs. Customers and the public reach bookings through
 * proposal.data.ts and booking-request.data.ts instead.
 */

// ============================================================================
// ACCESS
// ============================================================================

type DealAction = (typeof statement.booking)[number];

/** The person, when they may do `action` on this deal; AccessDenied otherwise. */
export async function assertDealAccess(bookingId: string, action: DealAction): Promise<SessionUser> {
  const user = await assertCan({ booking: [action] });
  if (!isUuid(bookingId)) throw new AccessDenied("Deal not found", 404);
  if (can(user, { booking: ["view-all"] })) return user;

  const [deal] = await bookingService.getAssignments([bookingId]);
  if (!deal) throw new AccessDenied("Deal not found", 404);
  if (deal.assignedAdminId !== user.id) throw new AccessDenied("This deal isn't assigned to you.");
  return user;
}

/** assertDealAccess for every boat in the deal's charter party. */
async function assertPartyAccess(bookingId: string, action: DealAction): Promise<SessionUser> {
  const user = await assertDealAccess(bookingId, action);
  if (can(user, { booking: ["view-all"] })) return user;

  const party = await bookingService.getAssignments(await bookingService.getPartyIds(bookingId));
  if (party.some((member) => member.assignedAdminId !== user.id)) {
    throw new AccessDenied("Another boat in this charter party isn't assigned to you.");
  }
  return user;
}

// ============================================================================
// THE VIEWER
// ============================================================================

/** What the person working deals may see and do (admin vs broker). */
interface DealViewer {
  userId: string;
  /** Where deal links point: "/admin/bookings" or "/brokers/deals". */
  basePath: string;
  /** Choose who a deal is assigned to. */
  canAssign: boolean;
  /** The company's costs and margin: Revenue card, expenses, Stripe links. */
  canSeeEconomics: boolean;
  /** Record money received off-card. */
  canRecordPayments: boolean;
  /** Link a new booking to a customer's account (needs the user list). */
  canLinkAccounts: boolean;
}

function viewerFor(user: SessionUser): DealViewer {
  return {
    userId: user.id,
    basePath: can(user, { booking: ["view-all"] }) ? "/admin/bookings" : "/brokers/deals",
    canAssign: can(user, { booking: ["assign"] }),
    canSeeEconomics: can(user, { booking: ["view-economics"] }),
    canRecordPayments: can(user, { booking: ["record-payment"] }),
    canLinkAccounts: can(user, { user: ["list"] }),
  };
}

export async function getDealViewer(): Promise<DealViewer> {
  return viewerFor(await assertCan({ booking: ["view"] }));
}

// ============================================================================
// READS
// ============================================================================

/** The company's costs and margin on a deal — stripped for anyone who may not see them. */
const ECONOMICS_FIELDS = [
  "opsExpenseCents",
  "opsGmvCents",
  "opsRevenueCents",
  "opsPaidCents",
  "opsSentToOwnerCents",
  "opsBalanceOwnerCents",
  "opsBalanceClientCents",
] as const satisfies readonly (keyof BookingListItem)[];

function withoutEconomics<T extends BookingListItem>(booking: T): T {
  const copy = { ...booking };
  for (const field of ECONOMICS_FIELDS) delete copy[field];
  return copy;
}

/** Board filters, plus "mine" (deals assigned to the person asking). */
type DealListFilters = BookingFilterInput & { mine?: boolean };

/** Admins see every deal; a broker only the ones assigned to them. */
function scopeFilters<T extends Partial<DealListFilters>>(user: SessionUser, filters: T): T {
  if (!can(user, { booking: ["view-all"] })) {
    return { ...filters, assignedAdminId: user.id, unassignedOnly: undefined, mine: undefined };
  }
  return filters.mine ? { ...filters, assignedAdminId: user.id, mine: undefined } : filters;
}

/** The deals board (and the bookings calendar). */
export async function listDeals(filters: DealListFilters): Promise<PaginatedBookingsResponse> {
  const user = await assertCan({ booking: ["view"] });
  const result = await bookingService.getAllBookings(scopeFilters(user, filters));
  if (can(user, { booking: ["view-economics"] })) return result;
  return { ...result, bookings: result.bookings.map(withoutEconomics) };
}

/** Deal counts per type for the board's strip, with the same scoping. */
export async function getDealTypeCounts(
  filters: Parameters<typeof bookingService.getBookingTypeCounts>[0] & { mine?: boolean }
) {
  const user = await assertCan({ booking: ["view"] });
  return bookingService.getBookingTypeCounts(scopeFilters(user, filters ?? {}));
}

/** Who deals can be assigned to (admins and brokers). */
export async function getAssignableStaff() {
  await assertCan({ booking: ["assign"] });
  return userService.getAdmins();
}

/**
 * Everything the deal page shows, or null when the deal isn't there or isn't
 * the person's to open (the page answers 404 either way).
 */
export async function getDealPage(id: string) {
  let user: SessionUser;
  try {
    user = await assertDealAccess(id, "view");
  } catch (error) {
    if (error instanceof AccessDenied) return null;
    throw error;
  }
  const viewer = viewerFor(user);

  const found = await bookingService.getBookingById(id);
  if (!found) return null;
  const booking = viewer.canSeeEconomics ? found : withoutEconomics(found);

  const [ops, expenseLines, events, payments, captains, crew, crewPool, admins, pricingTiers, party] =
    await Promise.all([
      viewer.canSeeEconomics ? bookingOpsService.getByBookingId(id) : Promise.resolve(null),
      viewer.canSeeEconomics ? bookingExpenseLineService.getLines(id) : Promise.resolve([]),
      bookingEventsService.listByBookingId(id),
      paymentService.getBookingPayments(id),
      captainProfileService.getCaptainsForAssignment(),
      bookingCrewService.listByBookingId(id),
      crewProfileService.getCrewForAssignment(),
      viewer.canAssign ? userService.getAdmins() : Promise.resolve([]),
      // Inquiries get every boat's tiers (Create proposal); priced deals get
      // their own boat's tiers for the Edit trip form.
      booking.bookingStatus === "INQUIRY"
        ? getBoatTiers()
        : booking.boatId
          ? getBoatTiers(booking.boatId)
          : Promise.resolve([]),
      // Charter party: sibling boats sailing under the same group.
      booking.bookingGroupId ? bookingService.getChargeableParty(id) : Promise.resolve(null),
    ]);

  return { viewer, booking, ops, expenseLines, events, payments, captains, crew, crewPool, admins, pricingTiers, party };
}

export type DealPageData = NonNullable<Awaited<ReturnType<typeof getDealPage>>>;

/** A deal and the other boats in its charter party (the assistant's lookup); null when not theirs. */
export async function getDealWithParty(id: string) {
  let user: SessionUser;
  try {
    user = await assertDealAccess(id, "view");
  } catch (error) {
    if (error instanceof AccessDenied) return null;
    throw error;
  }
  const [found, party] = await Promise.all([
    bookingService.getBookingById(id),
    bookingService.getChargeableParty(id),
  ]);
  if (!found) return null;
  const booking = can(user, { booking: ["view-economics"] }) ? found : withoutEconomics(found);
  return { booking, party };
}

/**
 * An inquiry about to be priced into a proposal (the new-booking form's
 * prefill). Null when there's no such deal; `bookingStatus` tells the page
 * when it's already past inquiry.
 */
export async function getInquiryForProposal(dealId: string) {
  await assertDealAccess(dealId, "edit");
  const deal = await bookingService.getBookingById(dealId);
  return deal
    ? { id: deal.id, bookingStatus: deal.bookingStatus, prefill: buildDealPrefillForBookingForm(deal) }
    : null;
}

// ============================================================================
// PIPELINE: contact, notes, archive, lost
// ============================================================================

const CONTACT_METHODS = ["EMAIL", "PHONE", "SMS", "IN_PERSON", "OTHER"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

async function requireDealState(bookingId: string) {
  const deal = await bookingService.getDealState(bookingId);
  if (!deal) throw new UserFacingError("Deal not found", 404);
  return deal;
}

/**
 * Log a contact attempt. The first one marks the deal "Contacted" on the
 * pipeline (firstContactedAt) — automation, no manual stage clicks.
 */
export async function logDealContact(
  bookingId: string,
  contactMethod: ContactMethod,
  content?: string
): Promise<{ pipelineAdvanced: boolean }> {
  const user = await assertDealAccess(bookingId, "edit");
  if (!CONTACT_METHODS.includes(contactMethod)) throw new UserFacingError("Invalid contact method");
  await requireDealState(bookingId);

  await bookingEventsService.logContact({
    bookingId,
    actorId: user.id,
    contactMethod,
    content: content?.trim() || null,
  });
  return { pipelineAdvanced: await bookingService.markFirstContacted(bookingId) };
}

export async function addDealNote(bookingId: string, content: string): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  const trimmed = content?.trim();
  if (!trimmed) throw new UserFacingError("Note cannot be empty");
  await requireDealState(bookingId);

  await bookingEventsService.logNote({ bookingId, actorId: user.id, content: trimmed, noteType: "GENERAL" });
}

/** Archive hides the deal from the default board (the archive bucket). */
export async function toggleDealArchived(bookingId: string): Promise<{ archived: boolean }> {
  const user = await assertDealAccess(bookingId, "edit");
  const deal = await requireDealState(bookingId);

  const archived = deal.archivedAt == null;
  await bookingService.setArchived(bookingId, archived);
  await bookingEventsService.logEvent({
    bookingId,
    eventType: archived ? "deal.archived" : "deal.unarchived",
    actorType: "admin",
    actorId: user.id,
    channel: "admin_portal",
    displayMessage: archived ? "Archived" : "Restored from archive",
  });
  return { archived };
}

/** Lose a deal — status CANCELLED with the reason recorded, then archived. */
export async function markDealLost(bookingId: string, reason: string): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  const trimmed = reason?.trim();
  if (!trimmed) throw new UserFacingError("A reason is required");
  await requireDealState(bookingId);

  await bookingStatusService.cancel(bookingId, trimmed, user.id);
  // The menu promises "moves to the archive bucket" — make it true.
  await bookingService.setArchived(bookingId, true);
}

// ============================================================================
// PROPOSAL LINK: share and send
// ============================================================================

function proposalUrl(publicToken: string): string {
  return `${getBaseUrl()}/bookings/proposal/${publicToken}`;
}

/**
 * Copying the proposal link IS publishing it — the customer is about to hold
 * a working URL. Stamps publishedAt on first share so the public proposal page
 * (which refuses unpublished tokens) accepts it, and logs the share once.
 * True when this call published it.
 */
export async function shareProposalLink(bookingId: string): Promise<boolean> {
  const user = await assertDealAccess(bookingId, "edit");
  const link = await bookingService.getProposalLinkInfo(bookingId);
  if (!link?.publicToken) throw new UserFacingError("No proposal link exists for this booking");

  const published = await bookingService.markPublished(bookingId);
  if (published) {
    await bookingEventsService.logEvent({
      bookingId,
      eventType: BOOKING_EVENT_TYPES.PROPOSAL_PUBLISHED,
      actorType: "admin",
      actorId: user.id,
      channel: "admin_portal",
      displayMessage: "Proposal link shared with the customer",
      metadata: { publicToken: link.publicToken, via: "copy_link" },
    });
  }
  return published;
}

/**
 * Send the proposal to the customer — SAME link every time, so there is only
 * ever one proposal URL per deal. Email and/or SMS; publishes the link if this
 * is the first send, and logs one timeline event so the desk sees it went out.
 */
export async function sendProposalUpdate(
  bookingId: string,
  channels: { email: boolean; sms: boolean }
): Promise<{ sent: string[]; isFirstSend: boolean }> {
  const user = await assertDealAccess(bookingId, "edit");
  if (!channels.email && !channels.sms) {
    throw new UserFacingError("Pick at least one channel (email or text)");
  }

  const row = await bookingService.getProposalLinkInfo(bookingId);
  if (!row?.publicToken) throw new UserFacingError("No proposal link exists for this booking");
  // The link serves the whole funnel: proposal while PROPOSED, payment page
  // once booked. Settled deals have nothing left to send.
  if (!["PROPOSED", "BOOKED"].includes(row.bookingStatus)) {
    throw new UserFacingError("This deal is settled — nothing left to send");
  }
  if (channels.email && !row.customerEmail?.trim()) {
    throw new UserFacingError("This customer has no email on file");
  }
  if (channels.sms && !row.customerPhone?.trim()) {
    throw new UserFacingError("This customer has no phone number on file");
  }

  const isPaymentStage = row.bookingStatus === "BOOKED";
  const link = proposalUrl(row.publicToken);
  // Sending IS publishing — the customer is about to hold a working URL.
  const isFirstSend = await bookingService.markPublished(bookingId);

  const sent: string[] = [];
  if (channels.email && row.customerEmail) {
    const ok = await sendProposalEmail({
      customerName: row.customerName ?? "there",
      customerEmail: row.customerEmail,
      proposalLink: link,
      boatName: row.boatName ?? undefined,
      isGroup: row.bookingGroupId != null,
      isUpdate: !isFirstSend,
    });
    if (!ok) throw new UserFacingError("Email failed to send — try again");
    sent.push("email");
  }
  if (channels.sms && row.customerPhone) {
    const body = isPaymentStage
      ? `Kings Of The Sea: Complete your charter booking here: ${link}`
      : isFirstSend
        ? proposalReadySms(link)
        : `Kings Of The Sea: Your charter proposal has been updated. Latest details: ${link}`;
    const smsResult = await sendSms(row.customerPhone, body);
    if (!smsResult.success) {
      // Email may already be out — report the partial send honestly.
      throw new UserFacingError(
        sent.length > 0 ? "Email sent, but the text failed — try SMS again" : "Text failed to send — try again"
      );
    }
    sent.push("text");
  }

  await bookingEventsService.logEvent({
    bookingId,
    eventType: isFirstSend
      ? BOOKING_EVENT_TYPES.PROPOSAL_PUBLISHED
      : BOOKING_EVENT_TYPES.PROPOSAL_UPDATE_SENT,
    actorType: "admin",
    actorId: user.id,
    channel: "admin_portal",
    displayMessage: isPaymentStage
      ? `Payment link re-sent by ${sent.join(" and ")}`
      : isFirstSend
        ? `Proposal sent to the customer by ${sent.join(" and ")}`
        : `Updated proposal re-sent by ${sent.join(" and ")}`,
    metadata: { publicToken: row.publicToken, channels: sent },
  });
  return { sent, isFirstSend };
}

function proposalReadySms(link: string): string {
  return `Kings Of The Sea: Your charter proposal is ready. View it and pay to book: ${link}`;
}

// ============================================================================
// PEOPLE: assigned admin, captain, crew
// ============================================================================

/** Assign the deal to an admin or broker, or pass null to unassign. */
export async function assignDealOwner(bookingId: string, adminId: string | null): Promise<void> {
  const user = await assertDealAccess(bookingId, "assign");
  if (adminId && !(await userService.isAssignableStaff(adminId))) {
    throw new UserFacingError("Deals can only be assigned to an admin or broker.");
  }
  await bookingService.assignAdmin(bookingId, adminId, user.id);
}

/** Assign the trip's captain, or pass null to unassign. */
export async function assignCaptain(bookingId: string, captainUserId: string | null): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  if (captainUserId && !(await captainProfileService.isAssignable(captainUserId))) {
    throw new UserFacingError("That person doesn't have an active captain profile.");
  }
  await bookingService.assignCaptain(bookingId, captainUserId, user.id);
}

export async function addCrewMember(
  bookingId: string,
  crewUserId: string,
  role?: string | null
): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  if (!crewUserId || !(await crewProfileService.isAssignable(crewUserId))) {
    throw new UserFacingError("That person doesn't have an active crew profile.");
  }
  try {
    await bookingCrewService.addMember(bookingId, crewUserId, user.id, role ?? null);
  } catch (error) {
    if (pgErrorCode(error) === "23505") {
      throw new UserFacingError("That crew member is already on this booking.", 409);
    }
    throw error;
  }
}

export async function removeCrewMember(bookingId: string, bookingCrewId: string): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  if (!isUuid(bookingCrewId)) throw new UserFacingError("Crew assignment not found", 404);
  await bookingCrewService.removeMember(bookingCrewId, bookingId, user.id);
}

// ============================================================================
// STATUS
// ============================================================================

/**
 * "They said yes on the phone" — PROPOSED → BOOKED without the customer
 * clicking anything. Books every open boat in the party. Checks each slot
 * first; the DB's no-overlap constraint is the backstop. Returns how many
 * boats were booked.
 */
export async function markDealBooked(bookingId: string): Promise<number> {
  const user = await assertPartyAccess(bookingId, "edit");

  const party = await bookingService.getChargeableParty(bookingId);
  if (!party || party.length === 0) throw new UserFacingError("Booking not found", 404);
  const open = party.filter((m) => m.booking.bookingStatus === "PROPOSED");
  if (open.length === 0) throw new UserFacingError("Only a proposal can be marked booked.");

  for (const m of open) {
    const b = m.booking;
    if (!b.boatId || !b.startDateTime || !b.endDateTime) continue;
    const { isAvailable } = await availabilityService.checkTimeSlotAvailability(
      b.boatId,
      new Date(b.startDateTime),
      new Date(b.endDateTime),
      b.id
    );
    if (!isAvailable) {
      throw new UserFacingError(
        `${m.boat?.name ?? "That boat"} is taken on the calendar for this window — move the trip first.`,
        409
      );
    }
  }

  let booked = 0;
  for (const m of open) {
    try {
      await bookingStatusService.markBooked(m.booking.id, {
        changedByUserId: user.id,
        reason: "Marked as booked by admin",
        actorType: "admin",
        channel: "admin_portal",
      });
      booked += 1;
    } catch (error) {
      if (isOverlapConstraintError(error)) {
        throw new UserFacingError(
          `${m.boat?.name ?? "A boat"} was taken at the same moment — ${booked} of ${open.length} booked; move that trip and retry.`,
          409
        );
      }
      throw error;
    }
  }
  return booked;
}

/** Mark a booked trip as completed (the charter happened). */
export async function markDealCompleted(bookingId: string): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  await bookingStatusService.complete(bookingId, user.id);
}

/** Cancel a booking with a reason (any active status). */
export async function cancelDeal(bookingId: string, reason: string): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  const trimmed = reason?.trim();
  if (!trimmed) throw new UserFacingError("A cancellation reason is required");
  await bookingStatusService.cancel(bookingId, trimmed, user.id);
}

// ============================================================================
// THE TRIP
// ============================================================================

/** Change exactly one booking field (validated per field). */
export async function updateDealField(bookingId: string, rawUpdate: unknown): Promise<void> {
  const user = await assertDealAccess(bookingId, "edit");
  const update = bookingSingleFieldUpdateSchema.parse(rawUpdate);
  await bookingService.applyBookingSingleFieldUpdate(bookingId, update, user.id);
}

/**
 * Apply the edited boat's start/end deltas to every OTHER boat in its charter
 * party — start and end move independently, so an end-time-only change
 * (longer/shorter trip) propagates like a date move, and any deliberate
 * stagger between boats stays intact. Each sibling goes through the same
 * single-field update (availability re-check, timeline event). Sequential and
 * non-transactional (neon-http): a mid-party failure names the boat that
 * stopped it, with earlier boats already moved. Returns how many moved.
 */
export async function shiftCharterPartyWindows(
  bookingId: string,
  deltaStartMs: number,
  deltaEndMs: number
): Promise<number> {
  const user = await assertPartyAccess(bookingId, "edit");
  const startDelta = Number.isFinite(deltaStartMs) ? deltaStartMs : 0;
  const endDelta = Number.isFinite(deltaEndMs) ? deltaEndMs : 0;
  if (startDelta === 0 && endDelta === 0) return 0;

  const party = await bookingService.getChargeableParty(bookingId);
  const siblings = (party ?? []).filter(
    (m) =>
      m.booking.id !== bookingId &&
      m.booking.bookingStatus !== "CANCELLED" &&
      m.booking.startDateTime != null &&
      m.booking.endDateTime != null
  );

  let moved = 0;
  for (const m of siblings) {
    const start = new Date(new Date(m.booking.startDateTime as Date).getTime() + startDelta);
    const end = new Date(new Date(m.booking.endDateTime as Date).getTime() + endDelta);
    try {
      await bookingService.applyBookingSingleFieldUpdate(
        m.booking.id,
        {
          field: "tripWindow",
          value: { startDateTime: start.toISOString(), endDateTime: end.toISOString() },
        },
        user.id
      );
      moved += 1;
    } catch (error) {
      console.error("Party shift failed on sibling:", m.booking.id, error);
      const name = m.boat?.name ?? "one of the boats";
      throw new UserFacingError(
        `${name} couldn't move (likely a calendar conflict). ${moved} of ${siblings.length} other boats were moved — fix ${name} on its own page.`,
        409
      );
    }
  }
  return moved;
}

/**
 * "Actually, we want another boat" — grow this booking into a charter party.
 * The sibling joins as PROPOSED under the same proposal link; resend it so the
 * customer sees (and re-accepts) the bigger party.
 */
export async function addBoatToCharterParty(
  bookingId: string,
  input: { boatId: string; pricingTierId: string }
): Promise<{ siblingId: string }> {
  const user = await assertDealAccess(bookingId, "edit");
  const { siblingId } = await bookingService.addBoatToParty(bookingId, input, user.id);
  return { siblingId };
}

// ============================================================================
// CREATE (the booking composer)
// ============================================================================

export type CreateDealResult = {
  bookingId: string;
  publicToken: string | null;
  groupId: string | null;
  /** True when at least one send channel was requested. */
  proposalSent: boolean;
  /** Per-channel outcome: null = not requested, false = requested but failed. */
  emailSent: boolean | null;
  smsSent: boolean | null;
};

/**
 * THE booking creation — every door (create page, deal-page proposal modal,
 * board header) submits here. One boat section = a single booking; several
 * = a charter party (group container + one row per boat, one proposal link,
 * one payment for the lot). Also stores the financials captured up front
 * (owner payout + expense lines, source) on each boat, and optionally emails
 * or texts the proposal.
 *
 * A broker prices only their own inquiries, every deal they create is theirs,
 * they can't link a booking to someone's account, and the company's costs
 * (expense lines) stay admin-only.
 */
export async function createDeal(rawInput: CreateBookingFullInput): Promise<CreateDealResult> {
  const user = await assertCan({ booking: ["create"] });
  let input = createBookingFullSchema.parse(rawInput);

  if (input.dealId) await assertDealAccess(input.dealId, "edit");
  const canLinkAccounts = can(user, { user: ["list"] });
  const canSeeEconomics = can(user, { booking: ["view-economics"] });
  input = {
    ...input,
    bookings: input.bookings.map((section) => ({
      ...section,
      userId: canLinkAccounts ? section.userId : null,
      expenseLines: canSeeEconomics ? section.expenseLines : [],
    })),
  };

  const sendEmail = input.sendProposalEmail ?? false;
  const sendText = input.sendProposalSms ?? false;
  const publishNow = sendEmail || sendText;
  const isParty = input.bookings.length > 1;

  // 1. The booking row(s): pricing, status history and the audit trail.
  const result = await bookingService.createBookings(
    {
      dealId: input.dealId ?? null,
      numberOfPassengers: input.numberOfPassengers,
      pickupLocation: input.pickupLocation ?? null,
      dropoffLocation: input.dropoffLocation ?? null,
      adminNotes: input.adminNotes ?? null,
      bookings: input.bookings,
      groupName: isParty ? `${input.bookings[0].customerName}'s charter party` : null,
      sendProposalEmail: sendEmail,
      sendProposalSms: sendText,
      publishNow,
    },
    user.id
  );
  const bookingId = result.bookingIds[0];
  if (!bookingId) throw new Error("Booking was not created");

  // 2. Per-boat financials. Every boat in a party has its own owner, costs
  //    and share of the gross — pooling them onto the lead would double-count
  //    GMV on the board. GMV is DERIVED from each boat's own pricing
  //    (total − card fee), never taken from the client.
  const pricingByBooking = new Map(
    (await bookingService.getPricingTotals(result.bookingIds)).map((r) => [r.bookingId, r])
  );
  const sourceOverride = input.source?.trim() || null;
  let partyGmvCents = 0;
  let partyOwnerPayoutCents = 0;

  for (const [index, id] of result.bookingIds.entries()) {
    const lines = input.bookings[index]?.expenseLines ?? [];
    // Expense lines first: saveLines totals every line (owner payout + other
    // costs) into booking_ops.expense_cents, which the ops upsert below folds
    // into revenue.
    if (lines.length > 0) {
      await bookingExpenseLineService.saveLines(
        id,
        lines.map((line, i) => ({
          category: line.category,
          amountCents: line.amountCents,
          label: line.label ?? null,
          sortOrder: line.sortOrder ?? i,
          source: line.source ?? "MANUAL",
        }))
      );
      partyOwnerPayoutCents += lines
        .filter((l) => l.category === "OWNER_PAYOUT")
        .reduce((sum, l) => sum + l.amountCents, 0);
    }

    const pricing = pricingByBooking.get(id);
    if (pricing) partyGmvCents += Number(pricing.totalAmountCents) - Number(pricing.serviceFeeCents ?? 0);

    // GMV is NOT stored here: left empty it follows the booking's price, so
    // later price edits move revenue too. Only a manual override sets it.
    await bookingOpsService.upsert(id, { sourceOverride });
  }

  const expenseLineCount = input.bookings.reduce((sum, b) => sum + (b.expenseLines?.length ?? 0), 0);
  if (expenseLineCount > 0 || sourceOverride) {
    await bookingEventsService.logEvent({
      bookingId,
      eventType: BOOKING_EVENT_TYPES.UPDATED,
      actorType: "admin",
      actorId: user.id,
      channel: "admin_portal",
      displayMessage:
        result.bookingIds.length > 1
          ? `Financials captured for ${result.bookingIds.length}-boat charter party`
          : "Financials captured at booking creation",
      newState: {
        boats: result.bookingIds.length,
        partyGmvCents,
        partyOwnerPayoutCents,
        expenseLineCount,
        source: sourceOverride,
      },
    });
  }

  // 3. Send. AWAITED on purpose: the toast must tell the truth. A failed
  //    send is logged on the timeline so the desk can see it and resend.
  let emailSent: boolean | null = null;
  let smsSent: boolean | null = null;
  if (result.publicToken && publishNow) {
    const link = proposalUrl(result.publicToken);
    const lead = input.bookings[0];
    if (sendEmail) {
      const leadBoatName = lead.boatId ? await boatService.getBoatName(lead.boatId) : null;
      // Parties name the fleet honestly: "52ft Prestige + 1 more".
      const boatName =
        leadBoatName && isParty ? `${leadBoatName} + ${input.bookings.length - 1} more` : leadBoatName;
      emailSent = await sendProposalEmail({
        customerName: lead.customerName,
        customerEmail: lead.customerEmail,
        proposalLink: link,
        boatName: boatName ?? undefined,
        isGroup: isParty,
      }).catch((err) => {
        console.error("Proposal email failed:", err);
        return false;
      });
    }
    if (sendText) {
      smsSent = lead.customerPhone?.trim()
        ? await sendSms(lead.customerPhone, proposalReadySms(link))
            .then((r) => r.success)
            .catch((err) => {
              console.error("Proposal SMS failed:", err);
              return false;
            })
        : false;
    }
    const failed = [emailSent === false ? "email" : null, smsSent === false ? "text" : null].filter(
      (c): c is string => c !== null
    );
    if (failed.length > 0) {
      await bookingEventsService.logEvent({
        bookingId,
        eventType: BOOKING_EVENT_TYPES.UPDATED,
        actorType: "system",
        channel: "admin_portal",
        displayMessage: `Proposal ${failed.join(" and ")} failed to send — resend from this page`,
        metadata: { emailSent, smsSent },
      });
    }
  }

  return {
    bookingId,
    publicToken: result.publicToken,
    groupId: result.groupId,
    proposalSent: publishNow,
    emailSent,
    smsSent,
  };
}
