import { relations } from "drizzle-orm";
import { bookings } from "../tables/bookings.table";
import { users } from "../tables/users.table";
import { boats } from "../tables/boats.table";
import { ownerAccounts } from "../tables/ownerAccounts.table";
import { boatPricingTiers } from "../tables/boatPricingTiers.table";
import { bookingGroups } from "../tables/bookingGroups.table";
import { reviews } from "../tables/reviews.table";
import { bookingPricing } from "../tables/bookingPricing.table";
import { bookingStatusHistory } from "../tables/bookingStatusHistory.table";
import { bookingEvents } from "../tables/bookingEvents.table";
import { bookingAdminNotes } from "../tables/bookingAdminNotes.table";
import { bookingOps } from "../tables/bookingOps.table";
import { bookingCrew } from "../tables/bookingCrew.table";
import { bookingExpenseLines } from "../tables/bookingExpenseLines.table";

// Relations for bookings table
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  // Core relationships
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
    relationName: "userBookings",
  }),
  ownerAccount: one(ownerAccounts, {
    fields: [bookings.ownerAccountId],
    references: [ownerAccounts.id],
  }),
  boat: one(boats, {
    fields: [bookings.boatId],
    references: [boats.id],
  }),
  captain: one(users, {
    fields: [bookings.captainUserId],
    references: [users.id],
    relationName: "captainBookings",
  }),
  pricingTier: one(boatPricingTiers, {
    fields: [bookings.pricingTierId],
    references: [boatPricingTiers.id],
  }),
  bookingGroup: one(bookingGroups, {
    fields: [bookings.bookingGroupId],
    references: [bookingGroups.id],
  }),

  // New related tables (1:1 and 1:many)
  pricing: one(bookingPricing, {
    fields: [bookings.id],
    references: [bookingPricing.bookingId],
  }),
  statusHistory: many(bookingStatusHistory),
  events: many(bookingEvents),
  adminNotes: many(bookingAdminNotes),
  ops: one(bookingOps),
  expenseLines: many(bookingExpenseLines),
  // Note: payments relation is handled via payable_type/payable_id in payments table

  // Admin assignment (current operational state)
  assignedAdmin: one(users, {
    fields: [bookings.assignedAdminId],
    references: [users.id],
    relationName: "assignedBookings",
  }),
  cancelledByUser: one(users, {
    fields: [bookings.cancelledBy],
    references: [users.id],
    relationName: "cancelledBookings",
  }),
  reviews: many(reviews),
  crewAssignments: many(bookingCrew),
}));
