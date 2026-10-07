/**
 * Booking activity / audit event types (dot notation).
 * Append-only log — add new types as strings; no enum migration needed.
 */
export const BOOKING_EVENT_TYPES = {
  CREATED: "booking.created",
  STATUS_CHANGED: "booking.status_changed",
  NOTE_ADDED: "booking.note_added",
  CONTACT_LOGGED: "booking.contact_logged",
  PAYMENT_RECEIVED: "booking.payment_received",
  /** The customer's bank opened a dispute (chargeback) on a card payment */
  DISPUTE_OPENED: "booking.dispute_opened",
  /** That dispute was decided or withdrawn */
  DISPUTE_CLOSED: "booking.dispute_closed",
  /** Admin edited booking fields (dates, customer, boat, pricing, …) */
  UPDATED: "booking.updated",
  /** assignedAdminId changed */
  ASSIGNED_ADMIN_CHANGED: "booking.assigned_admin_changed",
  /** captainUserId changed */
  ASSIGNED_CAPTAIN_CHANGED: "booking.assigned_captain_changed",
  /** booking_crew row added */
  CREW_MEMBER_ADDED: "booking.crew_member_added",
  /** booking_crew row removed */
  CREW_MEMBER_REMOVED: "booking.crew_member_removed",
  /** Proposal link published (emailed / texted / copied). The stored value
   *  predates the 2026-09 vocabulary change and stays for history's sake. */
  PROPOSAL_PUBLISHED: "booking.draft_published",
  /** Updated proposal re-sent to the customer (same link) */
  PROPOSAL_UPDATE_SENT: "booking.proposal_update_sent",
  /** Customer asked for changes from the public proposal page */
  CHANGE_REQUESTED: "booking.change_requested",
  /** Guest booking matched to a newly created/verified account */
  LINKED_TO_ACCOUNT: "booking.linked_to_account",
} as const;

export type BookingActorType = "user" | "admin" | "system";
