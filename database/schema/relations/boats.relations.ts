import { relations } from 'drizzle-orm';
import { boats } from '../tables/boats.table';
import { boatPricingTiers } from '../tables/boatPricingTiers.table';
import { boatBlocking } from '../tables/boatBlocking.table';
import { boatExternalCalendars } from '../tables/boatExternalCalendar.table';
import { bookings } from '../tables/bookings.table';
import { reviews } from '../tables/reviews.table';
import { users } from '../tables/users.table';
import { boatMakes } from '../tables/boatMakes.table';
import { boatModels } from '../tables/boatModels.table';
// Relations for boats table
export const boatsRelations = relations(boats, ({ one, many }) => ({
  owner: one(users, {
    fields: [boats.ownerId],
    references: [users.id],
  }),
  primaryCaptain: one(users, {
    fields: [boats.primaryCaptainUserId],
    references: [users.id],
    relationName: 'primaryCaptainBoats',
  }),
  make: one(boatMakes, {
    fields: [boats.makeId],
    references: [boatMakes.id],
  }),
  model: one(boatModels, {
    fields: [boats.modelId],
    references: [boatModels.id],
  }),
  pricingTiers: many(boatPricingTiers),
  blocking: many(boatBlocking),
  externalCalendars: many(boatExternalCalendars),
  bookings: many(bookings),
  reviews: many(reviews),
}));


