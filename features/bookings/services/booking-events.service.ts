import "server-only";

/**
 * Append-only booking activity log (audit + notes + contacts).
 */

import { db } from "@/database/db";
import { bookingEvents, users } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import {
  BOOKING_EVENT_TYPES,
  type BookingActorType,
} from "@/features/bookings/booking-events.constants";
import type { BookingStatus } from "@/database/types";
type ContactMethod = "EMAIL" | "PHONE" | "SMS" | "IN_PERSON" | "OTHER";

export interface LogBookingEventInput {
  bookingId: string;
  eventType: string;
  actorType: BookingActorType;
  actorId?: string | null;
  channel?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  displayMessage?: string | null;
  content?: string | null;
  contactMethod?: ContactMethod | null;
  metadata?: Record<string, unknown> | null;
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").toLowerCase();
}

export class BookingEventsService {
  async logEvent(input: LogBookingEventInput): Promise<void> {
    await db.insert(bookingEvents).values({
      bookingId: input.bookingId,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      channel: input.channel ?? null,
      previousState: input.previousState ?? null,
      newState: input.newState ?? null,
      displayMessage: input.displayMessage ?? null,
      content: input.content ?? null,
      contactMethod: input.contactMethod ?? null,
      metadata: input.metadata ?? null,
    });
  }

  /** Status transition — call alongside booking_status_history insert */
  async logStatusChange(params: {
    bookingId: string;
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    actorType: BookingActorType;
    actorId?: string | null;
    reason?: string | null;
    channel?: string | null;
  }): Promise<void> {
    const isCreate = params.fromStatus == null;
    const eventType = isCreate
      ? BOOKING_EVENT_TYPES.CREATED
      : BOOKING_EVENT_TYPES.STATUS_CHANGED;
    const displayMessage = isCreate
      ? `Booking created (${formatStatus(params.toStatus)})`
      : `Status: ${formatStatus(params.fromStatus!)} → ${formatStatus(params.toStatus)}`;

    await this.logEvent({
      bookingId: params.bookingId,
      eventType,
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      channel: params.channel ?? "web",
      previousState: params.fromStatus
        ? { bookingStatus: params.fromStatus }
        : null,
      newState: { bookingStatus: params.toStatus },
      displayMessage,
      metadata: params.reason ? { reason: params.reason } : null,
    });
  }

  async logNote(params: {
    bookingId: string;
    actorId: string;
    content: string;
    noteType: string;
  }): Promise<void> {
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.NOTE_ADDED,
      actorType: "admin",
      actorId: params.actorId,
      channel: "admin_portal",
      content: params.content,
      displayMessage: `Note (${params.noteType})`,
      metadata: { noteType: params.noteType },
    });
  }

  async logBookingUpdated(params: {
    bookingId: string;
    actorId: string;
    previousState: Record<string, unknown>;
    newState: Record<string, unknown>;
    changedFields: string[];
  }): Promise<void> {
    if (params.changedFields.length === 0) return;
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.UPDATED,
      actorType: "admin",
      actorId: params.actorId,
      channel: "admin_portal",
      previousState: params.previousState,
      newState: params.newState,
      displayMessage: `Updated: ${params.changedFields.join(", ")}`,
      metadata: { changedFields: params.changedFields },
    });
  }

  async logAssignedAdminChanged(params: {
    bookingId: string;
    actorId: string;
    previousAdminId: string | null;
    newAdminId: string | null;
  }): Promise<void> {
    const prev = params.previousAdminId ?? "—";
    const next = params.newAdminId ?? "—";
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.ASSIGNED_ADMIN_CHANGED,
      actorType: "admin",
      actorId: params.actorId,
      channel: "admin_portal",
      previousState: { assignedAdminId: params.previousAdminId },
      newState: { assignedAdminId: params.newAdminId },
      displayMessage:
        params.newAdminId == null
          ? "Admin unassigned"
          : params.previousAdminId == null
            ? "Admin assigned"
            : "Assigned admin changed",
      metadata: { previousAdminId: prev, newAdminId: next },
    });
  }

  async logAssignedCaptainChanged(params: {
    bookingId: string;
    actorId: string;
    previousCaptainUserId: string | null;
    newCaptainUserId: string | null;
  }): Promise<void> {
    const prev = params.previousCaptainUserId ?? "—";
    const next = params.newCaptainUserId ?? "—";
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.ASSIGNED_CAPTAIN_CHANGED,
      actorType: "admin",
      actorId: params.actorId,
      channel: "admin_portal",
      previousState: { captainUserId: params.previousCaptainUserId },
      newState: { captainUserId: params.newCaptainUserId },
      displayMessage:
        params.newCaptainUserId == null
          ? "Captain unassigned"
          : params.previousCaptainUserId == null
            ? "Captain assigned"
            : "Assigned captain changed",
      metadata: { previousCaptainUserId: prev, newCaptainUserId: next },
    });
  }

  async logProposalPublished(params: {
    bookingId: string;
    actorId: string | null;
    publicToken: string;
    groupId: string | null;
    allBookingIds: string[];
  }): Promise<void> {
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.PROPOSAL_PUBLISHED,
      actorType: params.actorId ? "admin" : "system",
      actorId: params.actorId ?? null,
      channel: "admin_portal",
      displayMessage: "Proposal published (customer link)",
      metadata: {
        publicToken: params.publicToken,
        groupId: params.groupId,
        bookingIds: params.allBookingIds,
      },
    });
  }

  async logContact(params: {
    bookingId: string;
    actorId: string;
    contactMethod: ContactMethod;
    content?: string | null;
  }): Promise<void> {
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.CONTACT_LOGGED,
      actorType: "admin",
      actorId: params.actorId,
      channel: "admin_portal",
      contactMethod: params.contactMethod,
      content: params.content ?? "Customer contacted",
      displayMessage: `Contact logged (${params.contactMethod})`,
    });
  }

  async logBookingCrewMemberAdded(params: {
    bookingId: string;
    actorId: string;
    bookingCrewId: string;
    crewUserId: string;
    role: string | null;
  }): Promise<void> {
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.CREW_MEMBER_ADDED,
      actorType: "admin",
      actorId: params.actorId,
      channel: "admin_portal",
      displayMessage: params.role
        ? `Crew added (${params.role})`
        : "Crew member added",
      metadata: {
        bookingCrewId: params.bookingCrewId,
        crewUserId: params.crewUserId,
        role: params.role,
      },
    });
  }

  async logBookingCrewMemberRemoved(params: {
    bookingId: string;
    actorId: string;
    bookingCrewId: string;
    crewUserId: string;
  }): Promise<void> {
    await this.logEvent({
      bookingId: params.bookingId,
      eventType: BOOKING_EVENT_TYPES.CREW_MEMBER_REMOVED,
      actorType: "admin",
      actorId: params.actorId,
      channel: "admin_portal",
      displayMessage: "Crew member removed",
      metadata: {
        bookingCrewId: params.bookingCrewId,
        crewUserId: params.crewUserId,
      },
    });
  }

  async listByBookingId(bookingId: string) {
    const actor = users;
    const rows = await db
      .select({
        id: bookingEvents.id,
        bookingId: bookingEvents.bookingId,
        actorType: bookingEvents.actorType,
        actorId: bookingEvents.actorId,
        eventType: bookingEvents.eventType,
        channel: bookingEvents.channel,
        previousState: bookingEvents.previousState,
        newState: bookingEvents.newState,
        displayMessage: bookingEvents.displayMessage,
        content: bookingEvents.content,
        contactMethod: bookingEvents.contactMethod,
        metadata: bookingEvents.metadata,
        createdAt: bookingEvents.createdAt,
        actorFirstName: actor.firstName,
        actorLastName: actor.lastName,
        actorEmail: actor.email,
      })
      .from(bookingEvents)
      .leftJoin(actor, eq(bookingEvents.actorId, actor.id))
      .where(eq(bookingEvents.bookingId, bookingId))
      .orderBy(desc(bookingEvents.createdAt));

    return rows;
  }
}

export const bookingEventsService = new BookingEventsService();
