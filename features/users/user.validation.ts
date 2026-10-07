import * as z from "zod";
import { emailSchema, phoneSchema } from "@/shared/lib/validation/common";
import { ASSIGNABLE_ROLES } from "./user-roles.constants";

/**
 * What an admin sets on a person. Their bio, address and photo are theirs to
 * edit (profile settings); captain and crew come from the promote flows;
 * verification comes from the person proving their email or phone.
 */

const nameSchema = z.string().trim().min(1, "Required").max(60);

/** Admin, broker, owner. Captain and crew are granted through their own flows. */
export const assignableRolesSchema = z.array(z.enum(ASSIGNABLE_ROLES));

export const createUserSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phoneNumber: phoneSchema,
  roles: assignableRolesSchema.default([]),
});

/** One row of the person's page at a time: their name, email or phone. */
export const updateUserDetailsSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phoneNumber: phoneSchema,
  })
  .partial();

/** Who appears in the people list. */
export const USER_LIST_VIEWS = ["admin", "broker", "owner", "captain", "crew", "customer", "deactivated"] as const;
export type UserListView = (typeof USER_LIST_VIEWS)[number];

/** User list filters. */
export interface UserFilterInput {
  page?: number;
  limit?: number;
  search?: string;
  view?: UserListView;
}

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserData = z.output<typeof createUserSchema>;
export type UpdateUserDetailsInput = z.infer<typeof updateUserDetailsSchema>;
