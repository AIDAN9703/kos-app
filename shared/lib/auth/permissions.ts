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
  booking: [
    "view", // open deals (a broker: only the ones assigned to them)
    "view-all", // every deal, whoever it's assigned to
    "create",
    "edit",
    "price",
    "assign", // choose who a deal is assigned to
    "record-payment", // money recorded off-card
    "refund",
    "view-economics", // the company's costs and margin on a deal
  ],
  boat: ["view", "edit", "delete"],
  blog: ["edit"], // write, publish and delete news posts
  settings: ["edit"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  admin: ac.newRole({
    ...adminAc.statements,
    booking: [...statement.booking],
    boat: [...statement.boat],
    blog: ["edit"],
    settings: ["edit"],
  }),
  // Works deals in the broker portal (/brokers): the deals assigned to them,
  // plus new ones they create. Sees boats to price trips; never the company's
  // margins, payments, refunds, settings or other people's deals.
  broker: ac.newRole({ booking: ["view", "create", "edit", "price"], boat: ["view"] }),
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

/** What a permission check asks for, e.g. { booking: ["view-all"] }. */
export type PermissionRequest = Parameters<(typeof roles)["admin"]["authorize"]>[0];

/**
 * True when any of these roles grants everything asked for. This is Better
 * Auth's own role check, run locally against the roles above: no request, and
 * the same answer on the server and in the browser.
 */
export function rolesCan(list: Role[], request: PermissionRequest): boolean {
  return list.some((role) => roles[role].authorize(request).success);
}
