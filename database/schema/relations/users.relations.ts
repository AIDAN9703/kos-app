import { relations } from "drizzle-orm";
import { users } from "../tables/users.table";
import { boats } from "../tables/boats.table";
import { captainProfiles } from "../tables/captainProfiles.table";
import { crewProfiles } from "../tables/crewProfiles.table";
import { ownerProfiles } from "../tables/ownerProfiles.table";
import { bookingCrew } from "../tables/bookingCrew.table";
import { bookings } from "../tables/bookings.table";
import { reviews } from "../tables/reviews.table";
import { notifications } from "../tables/notifications.table";
import { boatBlocking } from "../tables/boatBlocking.table";
// Relations for users table
export const usersRelations = relations(users, ({ one, many }) => ({
  // Profile extensions (1:1)
  captainProfile: one(captainProfiles, {
    fields: [users.id],
    references: [captainProfiles.userId],
  }),
  ownerProfile: one(ownerProfiles, {
    fields: [users.id],
    references: [ownerProfiles.userId],
  }),
  crewProfile: one(crewProfiles, {
    fields: [users.id],
    references: [crewProfiles.userId],
  }),

  // Boats owned by this user
  ownedBoats: many(boats, {
    relationName: "ownerBoats",
  }),

  // Boats where this user is primary captain
  captainedBoats: many(boats, {
    relationName: "primaryCaptainBoats",
  }),

  // Bookings
  bookings: many(bookings, {
    relationName: "userBookings",
  }),
  boatOwnerBookings: many(bookings, {
    relationName: "boatOwnerBookings",
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
  notifications: many(notifications),
  createdBlockings: many(boatBlocking),

  bookingCrewAssignments: many(bookingCrew),
}));
