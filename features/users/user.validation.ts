import * as z from "zod";
import { authProviderEnum } from "@/database/schema";
import { passwordSchema, phoneSchema, emailSchema } from "@/shared/lib/validation/common";
import { ASSIGNABLE_ROLES } from "./user-roles.constants";

// Common user schema for admin create/edit (no profile image URL; captain/crew via promote flows)
const userBaseSchema = z.object({
  // Personal Information
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional().nullable(),

  // Account Information
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  email: emailSchema,
  phoneNumber: phoneSchema,
  // Admin, broker, owner. Captain and crew are granted through their own flows.
  roles: z.array(z.enum(ASSIGNABLE_ROLES)).default([]),
  authProvider: z.enum(authProviderEnum.enumValues).default("EMAIL").optional(),

  // Contact Information
  address: z.string().max(100, "Address must be less than 100 characters").optional().nullable(),
  city: z.string().max(50, "City must be less than 50 characters").optional().nullable(),
  state: z.string().max(50, "State must be less than 50 characters").optional().nullable(),
  postalCode: z
    .string()
    .regex(/^[0-9a-zA-Z\s-]{3,10}$/, "Please enter a valid postal/zip code")
    .optional()
    .nullable(),
  country: z.string().max(50, "Country must be less than 50 characters").optional().nullable(),

  // Admin can set verification status (for testing/manual verification)
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  identityVerified: z.boolean().default(false),
  identityVerificationType: z.string().optional().nullable(),
});

// Create user schema (requires password)
export const createUserSchema = userBaseSchema.extend({
  password: passwordSchema,
});

// Update user schema (password is optional, all other fields are optional)
export const updateUserSchema = userBaseSchema.partial().extend({
  password: passwordSchema.optional(),
});

// User search/filter schema
export const userFilterSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  isAdmin: z.coerce.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFilterInput = z.infer<typeof userFilterSchema>;
