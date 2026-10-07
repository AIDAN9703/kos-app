import { pgEnum } from "drizzle-orm/pg-core";

// User related enums (roles live in user.role as text — see shared/lib/auth/permissions.ts)

export const userStatusEnum = pgEnum("UserStatus", [
  "ACTIVE",
  "PENDING_VERIFICATION",
  "INACTIVE",
  "SUSPENDED",
]);

// Captain profile status
export const captainStatusEnum = pgEnum("CaptainStatus", [
  "PENDING",           // Awaiting verification
  "ACTIVE",            // Verified and available for assignment
  "INACTIVE",          // Temporarily unavailable
  "ON_LEAVE",          // Extended absence
  "SUSPENDED",         // Admin suspended
]);

// Crew profile status (same lifecycle as captains; separate enum for DB clarity)
export const crewStatusEnum = pgEnum("CrewStatus", [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
]);

// Owner profile business type
export const ownerBusinessTypeEnum = pgEnum("OwnerBusinessType", [
  "INDIVIDUAL",        // Personal boat owner
  "COMPANY",           // Charter company or LLC
]);