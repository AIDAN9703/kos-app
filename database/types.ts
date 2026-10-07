/**
 * Row and enum types inferred from the database schema — the one source of
 * truth for what a table holds. Feature types narrow these (Pick/Omit) to
 * what each screen needs.
 */

import {
  users,
  boats,
  bookings,
  bookingPricing,
  bookingStatusHistory,
  payments,
  boatPricingTiers,
  captainProfiles,
  crewProfiles,
  ownerProfiles,
  notifications,
} from "./schema/tables";
import {
  userStatusEnum,
  captainStatusEnum,
  crewStatusEnum,
  bookingStatusEnum,
  bookingTypeEnum,
  bookingSourceEnum,
  adminNoteTypeEnum,
  bookingExpenseCategoryEnum,
  bookingExpenseLineSourceEnum,
  paymentStatusEnum,
  paymentTypeEnum,
  paymentMethodTypeEnum,
  payableTypeEnum,
  notificationPreferenceEnum,
} from "./schema/enums";

// ========================================
// USERS
// ========================================

export type User = typeof users.$inferSelect;
export type UserStatus = (typeof userStatusEnum.enumValues)[number];

// ========================================
// BOATS
// ========================================

export type Boat = typeof boats.$inferSelect;
export type NewBoat = typeof boats.$inferInsert;
export type BoatPricingTier = typeof boatPricingTiers.$inferSelect;

// ========================================
// BOOKINGS
// ========================================

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
/** 1:1 with a booking. */
export type BookingPricing = typeof bookingPricing.$inferSelect;
/** The status audit trail. */
export type BookingStatusHistory = typeof bookingStatusHistory.$inferSelect;

export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type BookingType = (typeof bookingTypeEnum.enumValues)[number];
export type BookingSource = (typeof bookingSourceEnum.enumValues)[number];
export type AdminNoteType = (typeof adminNoteTypeEnum.enumValues)[number];
export type BookingExpenseCategory = (typeof bookingExpenseCategoryEnum.enumValues)[number];
export type BookingExpenseLineSource = (typeof bookingExpenseLineSourceEnum.enumValues)[number];

// ========================================
// PAYMENTS
// ========================================

export type Payment = typeof payments.$inferSelect;
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentType = (typeof paymentTypeEnum.enumValues)[number];
export type PaymentMethodType = (typeof paymentMethodTypeEnum.enumValues)[number];
export type PayableType = (typeof payableTypeEnum.enumValues)[number];

// ========================================
// PROFILES (captain, crew, owner)
// ========================================

export type CaptainProfile = typeof captainProfiles.$inferSelect;
export type CaptainStatus = (typeof captainStatusEnum.enumValues)[number];
export type CrewProfile = typeof crewProfiles.$inferSelect;
export type CrewStatus = (typeof crewStatusEnum.enumValues)[number];
export type OwnerProfile = typeof ownerProfiles.$inferSelect;

// ========================================
// NOTIFICATIONS
// ========================================

export type Notification = typeof notifications.$inferSelect;
export type NotificationPreference = (typeof notificationPreferenceEnum.enumValues)[number];
