import { relations } from "drizzle-orm";
import { boats } from "../tables/boats.table";
import { bookings } from "../tables/bookings.table";
import { ownerAccountInvites, ownerAccountMembers, ownerAccounts } from "../tables/ownerAccounts.table";
import { ownerPayouts } from "../tables/ownerPayouts.table";
import { users } from "../tables/users.table";

export const ownerAccountsRelations = relations(ownerAccounts, ({ many }) => ({
  members: many(ownerAccountMembers),
  invites: many(ownerAccountInvites),
  boats: many(boats),
  bookings: many(bookings),
  payouts: many(ownerPayouts),
}));

export const ownerPayoutsRelations = relations(ownerPayouts, ({ one }) => ({
  ownerAccount: one(ownerAccounts, {
    fields: [ownerPayouts.ownerAccountId],
    references: [ownerAccounts.id],
  }),
  booking: one(bookings, {
    fields: [ownerPayouts.bookingId],
    references: [bookings.id],
  }),
}));

export const ownerAccountMembersRelations = relations(ownerAccountMembers, ({ one }) => ({
  ownerAccount: one(ownerAccounts, {
    fields: [ownerAccountMembers.ownerAccountId],
    references: [ownerAccounts.id],
  }),
  user: one(users, {
    fields: [ownerAccountMembers.userId],
    references: [users.id],
  }),
}));

export const ownerAccountInvitesRelations = relations(ownerAccountInvites, ({ one }) => ({
  ownerAccount: one(ownerAccounts, {
    fields: [ownerAccountInvites.ownerAccountId],
    references: [ownerAccounts.id],
  }),
}));
