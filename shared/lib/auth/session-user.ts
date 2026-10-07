import { parseRoles, type Role } from "./permissions";

/**
 * The signed-in person as the app sees them, on the server and in the
 * browser. Built once per request from the Better Auth user row, so role
 * changes and bans apply on the next request (nothing is cached in a cookie).
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  phoneNumber: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  roles: Role[];
  isAdmin: boolean;
  isBroker: boolean;
  isOwner: boolean;
  isCaptain: boolean;
  isCrew: boolean;
}

/** The Better Auth user fields this app reads. */
interface AuthUserRow {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  phoneVerified?: boolean | null;
  role?: string | null;
}

export function toSessionUser(user: AuthUserRow): SessionUser {
  const roles = parseRoles(user.role);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profileImage: user.image ?? null,
    phoneNumber: user.phoneNumber ?? null,
    phoneVerified: Boolean(user.phoneVerified),
    emailVerified: user.emailVerified,
    roles,
    isAdmin: roles.includes("admin"),
    isBroker: roles.includes("broker"),
    isOwner: roles.includes("owner"),
    isCaptain: roles.includes("captain"),
    isCrew: roles.includes("crew"),
  };
}

/** "Ada" + "Lovelace" → "Ada Lovelace"; falls back to the email's local part. */
export function displayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null
): string {
  const full = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return full || (email ? email.split("@")[0] : "");
}
