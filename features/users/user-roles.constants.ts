/** Roles an admin assigns on the people pages (shared with the browser). */
export const ASSIGNABLE_ROLES = ["admin", "broker", "owner"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ASSIGNABLE_ROLE_LABELS: Record<AssignableRole, { label: string; description: string }> = {
  admin: { label: "Admin", description: "Full access to the admin area, settings and users." },
  broker: { label: "Broker", description: "Works deals in the broker portal, only the ones assigned to them." },
  owner: { label: "Owner", description: "Sees their boats, charters and earnings in the owner portal." },
};
