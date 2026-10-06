/** Roles an admin assigns in the user form (shared with the browser). */
export const ASSIGNABLE_ROLES = ["admin", "broker", "owner"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ASSIGNABLE_ROLE_LABELS: Record<AssignableRole, { label: string; description: string }> = {
  admin: { label: "Admin", description: "Full access to the admin area, settings and users." },
  broker: { label: "Broker", description: "Works deals; will see only the deals assigned to them." },
  owner: { label: "Owner", description: "Opens the owner portal for the boats they own." },
};
