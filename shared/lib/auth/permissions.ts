import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Who may do what. Shared by the server and the browser, so nothing here may
 * import server code.
 *
 * Roles live on `user.role`, comma-separated: one person can hold several
 * (an owner who also books trips is just "owner"; booking is open to everyone).
 *
 * Statements answer "may this role do X at all". WHICH rows (a broker's own
 * deals, an owner's own boats, a customer's own trips) is decided in queries.
 */
export const statement = {
  // user + session management for the admin plugin (list, ban, impersonate…)
  ...defaultStatements,
  booking: ["view", "view-all", "edit", "price", "refund", "assign"],
  boat: ["edit", "delete"],
  settings: ["edit"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  admin: ac.newRole({
    ...adminAc.statements,
    booking: ["view", "view-all", "edit", "price", "refund", "assign"],
    boat: ["edit", "delete"],
    settings: ["edit"],
  }),
  // Staff who work deals. Not wired into the admin area yet: brokers will see
  // only the deals assigned to them once the bookings data layer lands.
  broker: ac.newRole({ booking: ["view", "edit", "price"] }),
  owner: ac.newRole({}),
  captain: ac.newRole({}),
  crew: ac.newRole({}),
  customer: ac.newRole({}),
};

export type Role = keyof typeof roles;

export const DEFAULT_ROLE: Role = "customer";

const KNOWN_ROLES = new Set<string>(Object.keys(roles));

/** "admin,owner" → ["admin", "owner"]; unknown entries are dropped. */
export function parseRoles(value: string | null | undefined): Role[] {
  const parsed = (value ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is Role => KNOWN_ROLES.has(role));
  return parsed.length > 0 ? parsed : [DEFAULT_ROLE];
}

/** Inverse of parseRoles; "customer" only when nothing else applies. */
export function formatRoles(list: Role[]): string {
  const unique = [...new Set(list)].filter((role) => role !== DEFAULT_ROLE);
  return unique.length > 0 ? unique.join(",") : DEFAULT_ROLE;
}
