import { relations } from "drizzle-orm";
import { users } from "../tables/users.table";
import { captainProfiles } from "../tables/captainProfiles.table";
import { crewProfiles } from "../tables/crewProfiles.table";
import { ownerAccountMembers } from "../tables/ownerAccounts.table";
import { bookingCrew } from "../tables/bookingCrew.table";
import { bookings } from "../tables/bookings.table";
import { reviews } from "../tables/reviews.table";
import { boatBlocking } from "../tables/boatBlocking.table";
// Relations for users table
export const usersRelations = relations(users, ({ one, many }) => ({
  // Profile extensions (1:1)
  captainProfile: one(captainProfiles, {
    fields: [users.id],
    references: [captainProfiles.userId],
  }),
  crewProfile: one(crewProfiles, {
    fields: [users.id],
    references: [crewProfiles.userId],
  }),

  // Owner accounts this person belongs to
  ownerAccountMemberships: many(ownerAccountMembers),

  // Bookings
  bookings: many(bookings, {
    relationName: "userBookings",
  }),
  captainBookings: many(bookings, {
    relationName: "captainBookings",
  }),
  reviewedBookings: many(bookings, {
    relationName: "reviewedBookings",
  }),
  assignedBookings: many(bookings, {
    relationName: "assignedBookings",
  }),
  cancelledBookings: many(bookings, {
    relationName: "cancelledBookings",
  }),

  // Reviews
  reviewsAsReviewer: many(reviews, {
    relationName: "reviewerReviews",
  }),
  reviewsAsReviewed: many(reviews, {
    relationName: "reviewedUserReviews",
  }),
  reviewsAsCaptain: many(reviews, {
    relationName: "reviewedCaptainReviews",
  }),

  // Other
  createdBlockings: many(boatBlocking),

  bookingCrewAssignments: many(bookingCrew),
}));
