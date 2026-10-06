/**
 * Centralized type exports from database schema
 * Single source of truth for all database types
 */

// Import all tables
import {
  users,
  boats,
  bookings,
  bookingPricing,
  bookingStatusHistory,
  bookingEvents,
  bookingAdminNotes,
  payments,
  reviews,
  boatPricingTiers,
  captainProfiles,
  crewProfiles,
  ownerProfiles,
  bookingCrew,
  bookingExpenseLines,
  blogPosts,
  notifications,
  boatBlocking,
} from "./schema/tables";

// Import all enums
import {
  // User enums
  userStatusEnum,
  captainStatusEnum,
  crewStatusEnum,
  ownerBusinessTypeEnum,

  // Boat enums
  boatCategoryEnum,
  timezoneEnum,

  // Booking enums
  bookingStatusEnum,
  bookingTypeEnum,
  bookingSourceEnum,
  adminNoteTypeEnum,
  bookingExpenseCategoryEnum,
  bookingExpenseLineSourceEnum,

  // Payment enums
  paymentStatusEnum,
  paymentTypeEnum,
  paymentMethodTypeEnum,
  payableTypeEnum,

  // Auth enums

  // Blog enums
  postCategoryEnum,
  postStatusEnum,

  // Notification enums
  notificationPreferenceEnum,

  // Availability enums
  blockingTypeEnum,
} from "./schema/enums";

// ========================================
// USER TYPES
// ========================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// User enums
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
// REMOVED: UserRole type - replaced with isAdmin boolean

// ========================================
// BOAT TYPES
// ========================================

export type Boat = typeof boats.$inferSelect;
export type NewBoat = typeof boats.$inferInsert;

export type BoatPricingTier = typeof boatPricingTiers.$inferSelect;
export type NewBoatPricingTier = typeof boatPricingTiers.$inferInsert;

export type BoatBlocking = typeof boatBlocking.$inferSelect;
export type NewBoatBlocking = typeof boatBlocking.$inferInsert;

// Boat enums
export type BoatCategory = (typeof boatCategoryEnum.enumValues)[number];
export type Timezone = (typeof timezoneEnum.enumValues)[number];
export type BlockingType = (typeof blockingTypeEnum.enumValues)[number];

// ========================================
// BOOKING TYPES
// ========================================

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// Booking pricing (1:1 with booking)
export type BookingPricing = typeof bookingPricing.$inferSelect;
export type NewBookingPricing = typeof bookingPricing.$inferInsert;

// Booking status history (audit trail)
export type BookingStatusHistory = typeof bookingStatusHistory.$inferSelect;
export type NewBookingStatusHistory = typeof bookingStatusHistory.$inferInsert;

// Booking events (activity / audit timeline)
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type NewBookingEvent = typeof bookingEvents.$inferInsert;

// Booking admin notes
export type BookingAdminNote = typeof bookingAdminNotes.$inferSelect;
export type NewBookingAdminNote = typeof bookingAdminNotes.$inferInsert;

// Booking enums
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type BookingType = (typeof bookingTypeEnum.enumValues)[number];
export type BookingSource = (typeof bookingSourceEnum.enumValues)[number];
export type AdminNoteType = (typeof adminNoteTypeEnum.enumValues)[number];
export type BookingExpenseCategory =
  (typeof bookingExpenseCategoryEnum.enumValues)[number];
export type BookingExpenseLineSource =
  (typeof bookingExpenseLineSourceEnum.enumValues)[number];

export type BookingExpenseLineRow = typeof bookingExpenseLines.$inferSelect;
export type NewBookingExpenseLineRow = typeof bookingExpenseLines.$inferInsert;

// ========================================
// PAYMENT TYPES
// ========================================

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// Payment enums
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentType = (typeof paymentTypeEnum.enumValues)[number];
export type PaymentMethodType = (typeof paymentMethodTypeEnum.enumValues)[number];
export type PayableType = (typeof payableTypeEnum.enumValues)[number];

// ========================================
// PROFILE EXTENSION TYPES
// ========================================

// Captain Profile (for users who are captains)
export type CaptainProfile = typeof captainProfiles.$inferSelect;
export type NewCaptainProfile = typeof captainProfiles.$inferInsert;
export type CaptainStatus = (typeof captainStatusEnum.enumValues)[number];

// Owner Profile (for users who own/list boats)
export type OwnerProfile = typeof ownerProfiles.$inferSelect;
export type NewOwnerProfile = typeof ownerProfiles.$inferInsert;
export type OwnerBusinessType = (typeof ownerBusinessTypeEnum.enumValues)[number];

export type CrewProfile = typeof crewProfiles.$inferSelect;
export type NewCrewProfile = typeof crewProfiles.$inferInsert;
export type CrewStatus = (typeof crewStatusEnum.enumValues)[number];

export type BookingCrew = typeof bookingCrew.$inferSelect;
export type NewBookingCrew = typeof bookingCrew.$inferInsert;

// ========================================
// REVIEW TYPES
// ========================================

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

// ========================================
// INQUIRY TYPES
// ========================================



// ========================================
// NOTIFICATION TYPES
// ========================================

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Notification enums
export type NotificationPreference = (typeof notificationPreferenceEnum.enumValues)[number];

// ========================================
// BLOG TYPES
// ========================================

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;

// Blog enums
export type PostCategory = (typeof postCategoryEnum.enumValues)[number];
export type PostStatus = (typeof postStatusEnum.enumValues)[number];

// ========================================
// COMMON FILTER TYPES
// ========================================

export interface BoatFilters {
  search?: string;
  category?: BoatCategory;
  status?: string;
  page?: number;
  limit?: number;
}

export interface BookingFilters {
  search?: string;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
